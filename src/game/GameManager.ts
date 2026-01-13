import * as THREE from 'three'
import { Player } from 'textalive-app-api'
import { GameLoop } from './GameLoop'
import { BubblePool } from './BubblePool'
import { TimerManager } from './TimerManager'
import type {
  PlayMode,
  GameConfig,
  GameResult,
  LyricData,
  MousePosition,
  ExtendedPlayer,
  PlayerAvatar,
  Landmark,
  TextAliveVideo,
} from './types'
import { calculateRank } from './types'

// グローバル変数として読み込まれたMediaPipeライブラリを参照
declare global {
  interface Window {
    Pose: any
    SelfieSegmentation: any
    FaceMesh: any
    Camera: any
    drawConnectors: any
    drawLandmarks: any
    POSE_CONNECTIONS: any
  }
}

const { Pose, SelfieSegmentation, FaceMesh, Camera, drawConnectors, drawLandmarks, POSE_CONNECTIONS } = window as any

const TextAliveApp = { Player }
const DEFAULT_SONG_ID = 'HmfsoBVch26BmLCm'
const TIMER_KEYS = {
  ComboReset: 'combo-reset',
  ResultCheck: 'result-check',
  ResultBackup: 'result-backup',
  SongProgress: 'song-progress',
  FinishWatch: 'finish-watch',
  FinishFallback: 'finish-fallback',
  BodyCountdown: 'body-countdown',
  FullBodyLost: 'full-body-lost',
  IdleTimeout: 'idle-timeout', // 30秒放置でリザルトへ
} as const

type HoldSource = 'pointer' | 'auto'

interface HoldState {
  progress: number
  scoredProgress: number
  duration: number
  pointerHolding: boolean
  autoHolding: boolean
  isComplete: boolean
  text: string
}

/**
 * ボイスアイドル・ミュージックゲーム - 内部処理のみ最適化版
 * 
 * 歌詞を表示してクリックするリズムゲームの実装
 * TextAliveプレーヤーを使用して歌詞タイミングを同期し、
 * APIが利用できない場合はフォールバックモードで動作
 */
class GameManager {
  // 基本設定
  private apiToken: string | undefined
  private songUrl: string | undefined
  public songId: string
  public onGameEnd: ((result: GameResult) => void) | undefined
  public resultReported: boolean
  public score: number
  public combo: number
  public maxCombo: number
  public scorePerHit: number
  private startTime: number
  public isPlaying: boolean
  private isPlayerInit: boolean
  public isFirstInteraction: boolean
  public player: ExtendedPlayer | null
  public displayedLyrics: Set<string | number>
  public activeLyricBubbles: Set<HTMLElement>
  private allowFallback: boolean
  private useFallback: boolean
  public mouseTrail: Array<{ element: HTMLElement }>
  public lastMousePos: MousePosition
  public apiLoaded: boolean
  private _operationInProgress: boolean
  public resultsDisplayed: boolean
  public isDebugMode: boolean = false
  private turnstileSiteKey: string | null
  private turnstileSiteKeyPromise: Promise<string | null> | null
  
  // デバイス・モード
  public isMobile: boolean
  public currentMode: PlayMode
  private pose: any | null
  public enableBodyWarning: boolean
  private suppressBodyWarningForSong: boolean
  private bodyDetection!: BodyDetectionManager
  private faceDetection!: FaceDetectionManager
  private visuals: LiveStageVisuals | null
  private gameLoop: GameLoop
  private playbackPosition: number
  private fallbackStartTime: number
  private bubbleBounds: Map<HTMLElement, { x: number; y: number; radius: number }>
  private currentBodyHolds: Set<HTMLElement> = new Set()
  private lastBoundsUpdate = 0
  public timers: TimerManager
  private holdStates: Map<HTMLElement, HoldState>
  private activePointerHold: HTMLElement | null
  private autoHoldTarget: HTMLElement | null
  private lyricSyncText: HTMLElement | null
  private lyricSyncTimer: number | null
  
  // ハンド検出
  private hands: { send(options: { image: HTMLVideoElement }): Promise<void> } | null
  // 以下は将来のhand mode実装用に保持
  private _handHistory: Array<{ x: number; y: number }>
  private _lastWaveTime: number
  private _waveThreshold: number
  private _waveTimeWindow: number
  
  // マネージャー
  public ui: UIManager
  public effects: EffectsManager
  public input: InputManager
  public viewport: ViewportManager
  public bubblePool: BubblePool
  private showFpsCounter: boolean
  private fpsOverlay: HTMLElement | null
  private fpsSamples: number[]
  private lastFpsUpdate: number
  
  // DOM要素
  public gamecontainer!: HTMLElement
  public scoreEl!: HTMLElement
  public comboEl!: HTMLElement
  public playpause!: HTMLButtonElement
  public restart!: HTMLButtonElement
  private loading: HTMLElement | null = null
  public countdownOverlay!: HTMLElement
  public countdownText!: HTMLElement
  
  // ゲーム状態
  public isPaused: boolean
  
  // 歌詞
  public enableViewerLyrics: boolean
  public displayedViewerLyrics: Map<HTMLElement, HTMLElement>
  public viewerLyricsContainer: HTMLElement | null
  public lyricsRenderer!: LyricsRenderer
  public resultsManager!: ResultsManager
  
  // 歌詞データ
  public lyricsData: LyricData[] = []
  private fallbackLyricsData: LyricData[] = []
  public currentLyricIndex = 0
  public _lyricScanIndex = 0
  public _lastLyricsPosition = 0
  private lastPlayerPosition = 0
  private songStartTime = 0
  public lastScoreTime = 0
  private lastLyricSpawnAt = 0
  private minResultTimestamp = 0

  /**
   * ゲームマネージャーの初期化
   * ゲームの基本設定、DOM要素の取得、イベントリスナーの設定を行う
   */
  constructor(config: GameConfig = {}) {
    // ????????
    this.apiToken = window.songConfig?.apiToken;
    this.songUrl = window.songConfig?.songUrl;
    this.songId = config.songId || this.apiToken || DEFAULT_SONG_ID;
    this.onGameEnd = config.onGameEnd;
    this.resultReported = false;
    this.score = this.combo = this.maxCombo = 0;
    this.scorePerHit = 0;
    this.startTime = Date.now();
    this.isPlaying = this.isPlayerInit = false;
    this.isFirstInteraction = true; // ?????????????
    this.player = null;
    // _activeChars はプロパティ宣言時に初期化済み
    this.displayedLyrics = new Set(); // ?????????
    this.activeLyricBubbles = new Set(); // ????????DOM???????
    this.allowFallback = false; // フォールバックを許可するか
    this.useFallback = false; // フォールバックが動作中か
    this.mouseTrail = [];
    // _maxTrailLength はプロパティ宣言時に初期化済み
    this.lastMousePos = { x: 0, y: 0 };
    this.minResultTimestamp = 0;
    this.apiLoaded = false; // TextAlive APIがロード完了したかを追跡
    this._operationInProgress = false; // 操作のロック状態を追跡（連打防止）
    this.resultsDisplayed = false; // リザルト画面表示フラグを初期化（重要：リザルト画面重複表示防止）
    this.turnstileSiteKey = config.turnstileSiteKey ?? null;
    this.turnstileSiteKeyPromise = null;
    
    // モバイルデバイス検出
    this.isMobile = this.detectMobileDevice();
    
    // URLパラメータまたはlocalStorageからモードを読み込む（モバイルの場合はcursor限定）
    const urlParams = new URLSearchParams(window.location.search);
    const urlMode = urlParams.get('mode');
    const storedMode = localStorage.getItem('gameMode');
    const normalizeMode = (mode: string | null | undefined): PlayMode | null => {
      if (mode === 'cursor' || mode === 'body' || mode === 'mobile' || mode === 'hand' || mode === 'face') return mode;
      return null;
    };
    const requestedMode = normalizeMode(config.mode) ?? normalizeMode(urlMode) ?? normalizeMode(storedMode);

    if (this.isMobile && requestedMode !== 'face') { // face mode can use camera on mobile
      console.log('モバイルデバイスを検出。カメラを無効化し、モバイル最適化モードを優先します。');
    }

    const prefersMobileMode = this.isMobile;

    if (prefersMobileMode) {
      if (requestedMode === 'body' || requestedMode === 'hand') {
          console.log(`モバイルデバイスのため、要求されたモード'${requestedMode}'からモバイルモードに変更しました。`);
          this.currentMode = 'mobile';
      } else {
          this.currentMode = requestedMode ?? 'mobile';
      }
    } else {
      this.currentMode = requestedMode === 'mobile' ? 'cursor' : (requestedMode ?? 'cursor');
    }
    console.log(`ゲームモード: ${this.currentMode} (URL: ${urlMode}, localStorage: ${storedMode})`);
    this.pose = null; // MediaPipe Poseインスタンス
    this.enableBodyWarning = true; // Body warning toggle for testing
    this.suppressBodyWarningForSong = false;
    
    // 内部処理用のグループサイズはプロパティ宣言時に初期化済み
    this.visuals = null; // Only create heavy 3D visuals when the mode requires it
    this.gameLoop = new GameLoop({ onUpdate: this.handleGameLoopUpdate });
    this.playbackPosition = 0;
    this.fallbackStartTime = 0;
    
    // ハンド検出用の初期化
    this.hands = null;
    this._handHistory = [];
    this._lastWaveTime = 0;
    this._waveThreshold = 0.1;
    this._waveTimeWindow = 400;
    
  // SRP: マネージャを準備（UI/入力/エフェクト/ビューポート）
  this.ui = new UIManager(this);
  this.effects = new EffectsManager(this);
  this.input = new InputManager(this);
  this.viewport = new ViewportManager();
  this.bubblePool = new BubblePool(48, 160);
  this.bubbleBounds = new Map();
  this.timers = new TimerManager();
  this.holdStates = new Map();
  this.activePointerHold = null;
  this.autoHoldTarget = null;
  this.lyricSyncText = null;
  this.lyricSyncTimer = null;
  this.showFpsCounter = this.shouldEnableFpsCounter();
  this.fpsOverlay = null;
  this.fpsSamples = [];
  this.lastFpsUpdate = 0;
  if (this.showFpsCounter) {
    this.createFpsOverlay();
  }
    
    // モバイルブラウザのビューポート処理（画面サイズ対応）
    this.updateViewportHeight();
    window.addEventListener('resize', () => this.updateViewportHeight());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.updateViewportHeight(), 100);
    });
    
    // 必要なDOM要素の取得
    const getEl = (id: string) => document.getElementById(id)
    this.gamecontainer = getEl('game-container') as HTMLElement
    this.scoreEl = getEl('score') as HTMLElement
    this.comboEl = getEl('combo') as HTMLElement
    this.playpause = getEl('play-pause') as HTMLButtonElement
    this.restart = getEl('restart') as HTMLButtonElement
    
    // 初期状態では無効化
    if (this.playpause) this.playpause.disabled = true;
    if (this.restart) this.restart.disabled = true;

    this.loading = getEl('loading')
    this.countdownOverlay = getEl('countdown-overlay') as HTMLElement
    this.countdownText = getEl('countdown-text') as HTMLElement
    this.lyricSyncText = getEl('lyric-sync-text')
    // SRP: ボディ検出に関する状態更新を専任マネージャーに委譲
    this.faceDetection = new FaceDetectionManager(this)
    this.bodyDetection = new BodyDetectionManager({ game: this, timers: this.timers })
    
    // 初期状態ではすべてのボタンを読み込み中と表示
    this.isPaused = true;
    
    // 30秒間ボタン操作がなければ強制リザルト画面へ (ゲーム開始前のみ)
    this.timers.setTimeout(TIMER_KEYS.IdleTimeout, () => {
      if (!this.isPlaying && !this.resultsDisplayed) {
        console.log('Idle timeout: Force show results');
        this.showResults();
      }
    }, 30000);

    // ゲームの基本セットアップ
    this.setupEvents();
    this.initGame();
    this.initPlayer();
    
    // 通常のカーソルを使用する（特別なスタイルは適用しない）
    this.gamecontainer.style.userSelect = 'none';
    
    // 結果表示用のタイマーを追加（曲終了時に確実にリザルト画面へ移行するため）

    // 鑑賞用歌詞（左上に流れる応援/閲覧用テキスト）機能
    // 要望によりデフォルト無効化（再度有効にしたい場合は true に変更）
    this.enableViewerLyrics = true;
    this.displayedViewerLyrics = new Map();
    if (this.enableViewerLyrics) {
      this.viewerLyricsContainer = document.createElement('div');
      this.viewerLyricsContainer.className = 'viewer-lyrics-container';
      this.gamecontainer.appendChild(this.viewerLyricsContainer);
    } else {
      this.viewerLyricsContainer = null;
    }

  // SRP: レンダリング/結果表示を専任クラスに委譲
  this.lyricsRenderer = new LyricsRenderer(this);
  this.resultsManager = new ResultsManager(this);

    // 初期モードに基づいてカメラを初期化
    this.initCamera();
    this.updateInstructions(); // 初期指示を更新
    this.gameLoop.start();
  }

  /**
   * モバイルデバイスかどうかを検出
   */
  isFaceMode(): boolean {
    return this.currentMode === 'face';
  }

  detectMobileDevice(): boolean {
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

  initCamera(): void {
    // モバイルデバイスの場合はカメラ機能を無効化 (ただしfaceモードを除く)
    if (this.isMobile && this.currentMode !== 'face') {
      console.log('モバイルデバイスが検出されました。カメラ機能は無効化されます。');
      return;
    }
    
    let videoElement = document.getElementById('camera-video') as HTMLVideoElement | null;
    if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.id = 'camera-video';
        videoElement.classList.add('hidden'); // デフォルトで非表示
        document.body.appendChild(videoElement);
    }
    const segmentationCanvas = document.getElementById('segmentation-canvas') as HTMLCanvasElement | null;
    if (!segmentationCanvas) return;
    const segmentationCtx = segmentationCanvas.getContext('2d');
    if (!segmentationCtx) return;

    const useCamera = this.currentMode === 'body' || this.currentMode === 'hand' || this.currentMode === 'face';

    // カメラとキャンバスの表示/非表示をモードに応じて切り替える
    if (useCamera) {
        // videoElementは常にhiddenのまま
        segmentationCanvas.classList.remove('hidden');
        if (this.currentMode === 'body' && !this.visuals) {
            this.visuals = new LiveStageVisuals(this.gamecontainer);
        }
    } else {
        // videoElementは常にhiddenのまま
        segmentationCanvas.classList.add('hidden');
        // モードが切り替わった際に、以前のMediaPipeインスタンスを破棄
        if (this.pose) {
            this.pose.close();
            this.pose = null;
        }
        this.faceDetection.close();
        return; // カメラが不要なモードではここで処理を終了
    }

    let canvasInitialized = false;
    const processInterval = 33; // ~30FPS
    let lastProcessTime = 0;

    const selfieSegmentation = new SelfieSegmentation({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    selfieSegmentation.setOptions({ modelSelection: 0, selfieMode: false });
    selfieSegmentation.onResults((results: any) => {
      segmentationCtx.save();
      segmentationCtx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
      segmentationCtx.translate(segmentationCanvas.width, 0);
      segmentationCtx.scale(-1, 1);
      segmentationCtx.drawImage(results.segmentationMask, 0, 0, segmentationCanvas.width, segmentationCanvas.height);
      segmentationCtx.globalCompositeOperation = 'source-in';
      segmentationCtx.drawImage(results.image, 0, 0, segmentationCanvas.width, segmentationCanvas.height);
      segmentationCtx.restore();
    });

    if (this.currentMode === 'body') {
      if (!this.pose) {
        this.pose = new Pose({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });
        this.pose.setOptions({
          modelComplexity: 0,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.pose.onResults((results: any) => this.handlePoseResults(results?.poseLandmarks));
      }
    } else if (this.pose) {
      this.pose.close();
      this.pose = null;
    }

    if (this.currentMode === 'face') {
        this.faceDetection.init();
    } else {
        this.faceDetection.close();
    }

    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (!canvasInitialized && videoElement.videoWidth > 0) {
          segmentationCanvas.width = videoElement.videoWidth;
          segmentationCanvas.height = videoElement.videoHeight;
          canvasInitialized = true;
        }
        const now = performance.now();
        if (now - lastProcessTime < processInterval) return;
        lastProcessTime = now;
        const frame = { image: videoElement };
        
        // FaceModeではsegmentationを使うか任意だが、一律で更新しておく
        await selfieSegmentation.send(frame);

        if (this.pose) await this.pose.send(frame);
        if (this.hands) await this.hands.send(frame);
        await this.faceDetection.send(frame);
      },
      width: 320,
      height: 240,
    });
    camera.start();
  }

  /**
   * モバイルブラウザのビューポート高さを更新
   * CSSの--vh変数を設定してモバイルブラウザでの100vh問題を解決
   */
  updateViewportHeight() {
  // SRP: ViewportManagerに委譲
  return this.viewport.updateViewportHeight();
  }

  /**
   * ゲームの指示テキストを更新する
   */
  updateInstructions() {
  // SRP: UIManagerに委譲
  return this.ui.updateInstructions();
  }

  private isAbortError(error: unknown): boolean {
    return Boolean(error && typeof error === 'object' && 'name' in error && (error as { name?: string }).name === 'AbortError');
  }

  public isBodyWarningEnabled(): boolean {
    return this.enableBodyWarning && !this.suppressBodyWarningForSong;
  }

  public suppressBodyWarningsForSong(): void {
    if (this.suppressBodyWarningForSong) return;
    this.suppressBodyWarningForSong = true;
    this.bodyDetection.cancelCountdown();
    this.bodyDetection.cancelFullBodyWarning();
    this.countdownText.textContent = '';
    this.countdownOverlay.classList.add('hidden');
    console.log('Body warnings suppressed for this song.');
  }

  public async getTurnstileSiteKey(): Promise<string | null> {
    if (this.turnstileSiteKey) return this.turnstileSiteKey;
    if (this.turnstileSiteKeyPromise) return this.turnstileSiteKeyPromise;

    const promise = fetch('/api/config')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        const key = data?.data?.turnstileSiteKey;
        if (typeof key === 'string' && key.trim()) {
          this.turnstileSiteKey = key;
          return key;
        }
        return null;
      })
      .catch(error => {
        console.error('[GameManager] Failed to fetch Turnstile site key', error);
        return null;
      });

    this.turnstileSiteKeyPromise = promise;
    promise.finally(() => {
      this.turnstileSiteKeyPromise = null;
    });
    return promise;
  }

  private handleGameLoopUpdate = (delta: number, elapsed: number): void => {
    // three.js シーン描画を統合（body モード時のみ）
    this.visuals?.render();

    if (this.showFpsCounter) {
      this.updateFpsDisplay(delta, elapsed);
    }
    if (this.isPaused || this.isFirstInteraction || this.bodyDetection.isCountdownActive()) return;
    const position = this.getPlaybackPosition();
    if (position == null) return;
    this.updateLyrics(position);
    this.updateHoldStates(delta);
    this.refreshBubbleBounds(elapsed);
  }

  private getPlaybackPosition(): number | null {
    if (this.useFallback) {
      if (!this.fallbackStartTime) return null;
      const fallbackPos = performance.now() - this.fallbackStartTime;
      this.playbackPosition = fallbackPos;
      return fallbackPos;
    }

    if (this.player && this.isPlayerInit) {
      try {
        const pos = this.player.timer?.position ?? this.playbackPosition;
        this.playbackPosition = pos;
        return pos;
      } catch {
        return this.playbackPosition;
      }
    }

    return this.playbackPosition;
  }



  /**
   * 音楽再生を開始する
   * プレーヤーの初期化状態に応じて、TextAlivePlayerまたはフォールバックモードで再生
   */
  async playMusic(): Promise<void> {
    console.log("playMusic called.");
    // 操作が進行中なら何もしない（連打防止）
    if (this._operationInProgress) return;
    this._operationInProgress = true;
    this.minResultTimestamp = Date.now() + 4000; // 再生開始からしばらくはリザルトを出さない

    if (this.currentMode === 'body' && !this.bodyDetection.isReady()) {
      console.log("playMusic: body mode and detection is not ready. Showing adjustment message.");
      this.bodyDetection.remindAdjustment();
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
              if (!this.isAbortError(e)) {
                console.error("Player play error:", e);
                // エラー発生時はフォールバックモードへ
                if (this.allowFallback) {
                  this.fallback();
                  this.startLyricsTimer();
                }
              }
            }
          }
        } catch (e) {
          if (!this.isAbortError(e)) {
            console.error("Player play error:", e);
            // エラー発生時はフォールバックモードへ
            if (this.allowFallback) {
              this.fallback();
              this.startLyricsTimer();
            }
          }
        }
      } else {
        // フォールバックモードですでに初期化済みの場合
        this.useFallback = true;
        this.startTime = Date.now();
        this.fallbackStartTime = performance.now();
        this.playbackPosition = 0;
        this.startLyricsTimer();
      }
      
  // 観客のランダムテキスト機能は削除
      
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
  startSongProgressMonitor(): void {
    this.timers.setInterval(TIMER_KEYS.SongProgress, () => {
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
          this.timers.clearTimer(TIMER_KEYS.SongProgress);
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
          this.timers.clearTimer(TIMER_KEYS.SongProgress);
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
   */
  setupResultCheckTimer(duration: number): void {
    // 既存のタイマーをクリア（重複防止）
    this.clearResultTimers();

    // 曲の終了時に結果を表示するタイマーを設定
    this.timers.setTimeout(TIMER_KEYS.ResultCheck, () => {
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
    this.timers.setTimeout(TIMER_KEYS.ResultBackup, () => {
      if (!this.resultsDisplayed) {
        console.log("バックアップタイマーが発火しました");
        this.showResults();
      }
    }, duration + 20000); // メインタイマーから20秒後に変更
  }

  public cancelResultTimers(): void {
    this.clearResultTimers();
  }

  private clearResultTimers(): void {
    this.timers.clearTimer(TIMER_KEYS.ResultCheck);
    this.timers.clearTimer(TIMER_KEYS.ResultBackup);
  }

  getSafeBubbleXPercent(): number {
    const maxTries = 8;
    const minGapPx = 140; // 横方向の最小距離
    const rangeMin = 12;
    const rangeMax = 88;

    for (let i = 0; i < maxTries; i++) {
      const candidate = rangeMin + Math.random() * (rangeMax - rangeMin);
      const candidatePx = (candidate / 100) * window.innerWidth;
      let safe = true;
      for (const [, bounds] of this.bubbleBounds) {
        if (Math.abs(candidatePx - bounds.x) < minGapPx + bounds.radius) {
          safe = false;
          break;
        }
      }
      if (safe) return candidate;
    }
    return rangeMin + Math.random() * (rangeMax - rangeMin);
  }

  /**
   * ゲームのイベントハンドラを設定
   * マウス、タッチ、ボタンのイベントを処理
   */
  setupEvents() {
  // SRP: InputManagerに委譲
  return this.input.setupEvents();
  }

  /**
   * ゲームの初期化
   * 背景要素の生成と歌詞データの準備
   */
  initGame(): void {
    this.visuals = this.currentMode === 'body' ? new LiveStageVisuals(this.gamecontainer) : null;
    this.createAudiencePenlights();
    this.lyricsData = [];
    
    // フォールバック用の歌詞データ - 1行ごとに区切る（提供歌詞を使用）
    const fallbackLines = [
      "So tell us ストリートライト",
      "揺らめく都市の magic",
      "街明かりが渦巻く　躓く my mind",
      "再起動 the other night",
      "(Don’t you know？)",
      "Ah 強引に goin' on",
      "好きも得意も　もう全部奏でたいんだ",
      "(Yeah do it！)",
      "めくるめく　この雑踏をかき分けていく",
      "光差す道を目指して",
      "空回る今だって僕らの祈り　毎秒更新",
      "不安感だって攫っていく未来に ride on",
      "Yeah！",
      "終わりなんてない",
      "この手掴めば　また始まるんだ",
      "グシャグシャのまま描いた“アイ”",
      "It's all right！",
      "灯した歌は　君に届く",
      "躊躇いはない",
      "そう、一人じゃないから",
      "(鼓動、心、不可能を超えてゆけ)",
      "曖昧な夢さえも抱いて",
      "(踊る、震える、重なる想いだけ)",
      "あふれるストーリーに乗せて",
      "立ち尽くす街角",
      "どれほど間違っても",
      "この灯火は何度だって輝く",
      "(宿す against gravity)",
      "ここからはノンストップ",
      "宵闇の中でも消えない星を繋いでいたい",
      "止め処なく bluff, bluff",
      "言葉の飾り　毎秒更新",
      "揺らぐ主役　舞台は未知の最前線",
      "Yeah！",
      "もう正解なんてない",
      "奏でた今日が　僕らの道だ",
      "ずっと手放したくないんだ“アイ”",
      "いつだって願いを歌えば　君に会える",
      "最高のステージ",
      "夢はもう譲れないんじゃない？",
      "零れたメモリを誘って",
      "Twilight to tell us",
      "Starlight to tell us",
      "終わりなんてない",
      "この手掴めば　また始まるんだ",
      "グシャグシャのまま描いた \"アイ\"",
      "It's all right！",
      "灯した歌は　君に届く",
      "躊躇いはない",
      "そう、一人じゃないから",
      "(鼓動、心、不可能を超えてゆけ)",
      "曖昧な夢さえも抱いて",
      "(踊る、震える、重なる想いだけ)",
      "あふれるストーリーに乗せて",
      "咲かせた未来のその先へ",
    ];
    this.fallbackLyricsData = [];

    // 1行ごとに歌詞データを生成（行長ベースで表示時間を調整）
    let currentTime = 1000;
    const minLineDuration = 2000;
    const perCharMs = 280;
    const gapMs = 400;
    fallbackLines.forEach(line => {
      const normalized = (line || '').normalize('NFC');
      const duration = Math.max(normalized.length * perCharMs, minLineDuration);
      this.fallbackLyricsData.push({
        time: currentTime,
        text: normalized,
        displayDuration: duration,
        originalChars: [{
          text: normalized,
          timeOffset: 0
        }]
      });
      currentTime += duration + gapMs;
    });
    
    // コンボをリセットするタイマー（30秒間何も取らなかったらコンボリセット）
    this.timers.setInterval(TIMER_KEYS.ComboReset, () => {
      if (Date.now() - (this.lastScoreTime || 0) > 30000 && this.combo > 0) {
        this.combo = 0;
        this.comboEl.textContent = `コンボ: 0`;
      }
    }, 1000);
    this.lastLyricSpawnAt = 0;
  }

  createAudiencePenlights(): void {
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
  // 観客のランダムテキスト機能は削除

  /**
   * 再生/一時停止を切り替える
   * プレーヤーの状態に応じて適切な処理を行う
   */
  async togglePlay(): Promise<void> {
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
        
        // 一時停止時にタイマーを停止
        this.clearResultTimers();
        this.cancelFinishGuards();
      } else {
        // 再生処理
        if (this.player) {
          if (!this.player.isPlaying) {
            try {
              // Promise形式ではなくtry-catch形式に変更
              await this.player.requestPlay();
            } catch (e) {
              if (!this.isAbortError(e)) {
                console.error("Play error:", e);
                this.fallback();
              }
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
  async restartGame(): Promise<void> {
    if (this._operationInProgress) return; // 連打防止
    this._operationInProgress = true;
    
    // 各種タイマーをクリア
    this.clearResultTimers();
    this.timers.clearTimer(TIMER_KEYS.SongProgress);
    this.cancelFinishGuards();
    this.bodyDetection.reset();
    
    // スコアと状態のリセット
    this.score = this.combo = this.currentLyricIndex = 0;
    this.scorePerHit = 0;
    this.startTime = Date.now();
    this.songStartTime = Date.now(); // 曲の開始時間をリセット
  this._lyricScanIndex = 0; // 歌詞インデックスをリセット
  this._lastLyricsPosition = 0;
    this.isPaused = false;
    this.scoreEl.textContent = '0';
    this.comboEl.textContent = `コンボ: 0`;
    this.resultsDisplayed = false; // リザルト表示フラグをリセット（重要）
    this.resultReported = false;
    
    // ボディモードの場合は検出フラグをリセット（再度カウントダウンが必要）
    if (this.currentMode === 'body') {
      this.isFirstInteraction = true;
      console.log("ボディモード: リスタート時に検出フラグをリセット");
    }
    
    // 結果画面を非表示にする
    const resultsScreen = document.getElementById('results-screen');
    if (resultsScreen) {
      resultsScreen.classList.remove('show');
      resultsScreen.classList.add('hidden');
    }
    
    // 表示中の歌詞を全てプールに戻す
    this.clearActiveBubbles();
    this.displayedLyrics.clear();
    
    // リザルト表示タイマーを再設定
    this.clearResultTimers();
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
          await this.player.requestPlay();
        } catch (e) {
          if (!this.isAbortError(e)) {
            console.error("Play error:", e);
            this.fallback();
          }
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
  initPlayer(): void {
    // TextAliveが利用可能かチェック
    if (typeof TextAliveApp === 'undefined') {
      if (this.loading) this.loading.textContent = "TextAliveが見つかりません。代替モードで起動中...";
      if (this.allowFallback) this.fallback();
      return;
    }
    
    try {
      // プレーヤーの作成
      this.player = new TextAliveApp.Player({
        app: { token: this.apiToken ?? '' },
        mediaElement: document.createElement('audio')
      }) as ExtendedPlayer;
      if (this.player.mediaElement) document.body.appendChild(this.player.mediaElement);
      this.isPlayerInit = true;
      
      // 各種イベントリスナーを設定
      this.player.addListener({
        // アプリ準備完了時
        onAppReady: (app: { managed?: boolean }) => {
          if (app && !app.managed) {
            try {
              if (this.player && this.songUrl) this.player.createFromSongUrl(this.songUrl);
            } catch (e) {
              console.error("Song creation error:", e);
              if (this.allowFallback) this.fallback();
            }
          }
        },
        // 動画準備完了時（歌詞データ取得） 
        onVideoReady: (video: TextAliveVideo | null) => {
          this.useFallback = false; // TextAlive正常利用
          if (video?.firstPhrase) this.processLyrics(video);
          
          // APIロード完了を記録するが、すぐにはボタンを有効化しない
          if (this.loading) this.loading.textContent = "準備中...";
          
          // 完全なセットアップのために追加の待機時間を設ける
          setTimeout(() => {
            this.apiLoaded = true; // ここでAPIロード完了フラグを設定
            
            // すべてのボタンのテキストを更新
            if (this.playpause) {
              const span = this.playpause.querySelector('span');
              if (span) span.textContent = '再生';
              else this.playpause.textContent = '再生';
              this.playpause.disabled = false;
            }
            if (this.restart) {
              const span = this.restart.querySelector('span');
              if (span) span.textContent = '最初から';
              else this.restart.textContent = '最初から';
              this.restart.disabled = false;
            }
            
            if (this.loading) this.loading.textContent = "準備完了-「再生」ボタンを押してね";
          }, 2000); // 2秒の追加待機時間
        },
        // 時間更新時（歌詞表示タイミング制御）
        onTimeUpdate: (pos: number) => {
          this.playbackPosition = pos;
          this.lastPlayerPosition = pos; // 最終再生位置を記録
        },
        // 再生開始時
        onPlay: () => {
          this.isPaused = false;
          if (this.playpause) {
            const span = this.playpause.querySelector('span');
            if (span) span.textContent = '一時停止';
            else this.playpause.textContent = '一時停止';
          }
          // 再生開始位置に歌詞インデックスを同期
          try {
            const pos = this.player?.timer?.position || 0;
            this.syncLyricIndexToPosition(pos);
            this._lastLyricsPosition = pos;
          } catch {}
          // 観客のランダムテキスト機能は削除
          this.startFinishGuards();
        },
        // 一時停止時
        onPause: () => {
          this.isPaused = true;
          if (this.playpause) {
            const span = this.playpause.querySelector('span');
            if (span) span.textContent = '再生';
            else this.playpause.textContent = '再生';
          }
          // 観客のランダムテキスト機能は削除
        },
        // 停止時（自動リスタートを廃止し、終了間際ならリザルトを表示）
        onStop: () => {
          this.isPaused = true;
          if (this.playpause) {
            const span = this.playpause.querySelector('span');
            if (span) span.textContent = '再生';
            else this.playpause.textContent = '再生';
          }
          const duration = this.player?.video?.duration;
          if (!this.resultsDisplayed && duration && this.lastPlayerPosition && duration - this.lastPlayerPosition < 1500) {
            console.log('onStop 終了直前停止を検出 → リザルト表示');
            this.showResults();
          } else {
            console.log('onStop 通常停止（再生ボタン待機）');
          }
        },
        // 曲終了時（最重要：ここでリザルト画面を表示）
        onFinish: () => {
          console.log("🎵 onFinish イベントが発火しました");
          console.log("resultsDisplayed状態:", this.resultsDisplayed);
          console.log("現在のモード:", this.currentMode);
          this.cancelFinishGuards();
          if (!this.resultsDisplayed) {
            this.showResults();
          } else {
            console.log("すでにリザルト画面が表示済みです");
          }
        },
        // エラー発生時
        onError: (e: Error) => {
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
    // ??????
    if (this.useFallback) return;
    this.useFallback = true;
    this.fallbackStartTime = performance.now();
    this.playbackPosition = 0;

    this.isPlayerInit = false;
    if (this.player?.mediaElement) {
      try { (this.player.mediaElement as HTMLAudioElement).pause(); } catch {}
    }
    this.player = null;
    
    if (this.loading) this.loading.textContent = "?????????...";
    this.lyricsData = this.fallbackLyricsData;
    
    // ???????????
    setTimeout(() => {
      this.apiLoaded = true; // ???API???????????
      
      // ????????
      if (this.playpause) {
        const span = this.playpause.querySelector('span');
        if (span) span.textContent = '再生';
        else this.playpause.textContent = '再生';
        this.playpause.disabled = false;
      }
      if (this.restart) {
        const span = this.restart.querySelector('span');
        if (span) span.textContent = '最初から';
        else this.restart.textContent = '最初から';
        this.restart.disabled = false;
      }
      
      if (this.loading) this.loading.textContent = "???? - ?????????????????";
    }, 2000); // 2??????
  }

  /**
   * 歌詞データを処理する
   * TextAliveから取得した歌詞データをシンプルに内部形式に変換
   */
  processLyrics(video: TextAliveVideo): void {
    try {
      this.lyricsData = [];
      this._lyricScanIndex = 0;
      const scriptedLines = [
        "So tell us ストリートライト",
        "揺らめく都市の magic",
        "街明かりが渦巻く　躓く my mind",
        "再起動 the other night",
        "(Don’t you know？)",
        "Ah 強引に goin' on",
        "好きも得意も　もう全部奏でたいんだ",
        "(Yeah do it！)",
        "めくるめく　この雑踏をかき分けていく",
        "光差す道を目指して",
        "空回る今だって僕らの祈り　毎秒更新",
        "不安感だって攫っていく未来に ride on",
        "Yeah！",
        "終わりなんてない",
        "この手掴めば　また始まるんだ",
        "グシャグシャのまま描いた“アイ”",
        "It's all right！",
        "灯した歌は　君に届く",
        "躊躇いはない",
        "そう、一人じゃないから",
        "(鼓動、心、不可能を超えてゆけ)",
        "曖昧な夢さえも抱いて",
        "(踊る、震える、重なる想いだけ)",
        "あふれるストーリーに乗せて",
        "立ち尽くす街角",
        "どれほど間違っても",
        "この灯火は何度だって輝く",
        "(宿す against gravity)",
        "ここからはノンストップ",
        "宵闇の中でも消えない星を繋いでいたい",
        "止め処なく bluff, bluff",
        "言葉の飾り　毎秒更新",
        "揺らぐ主役　舞台は未知の最前線",
        "Yeah！",
        "もう正解なんてない",
        "奏でた今日が　僕らの道だ",
        "ずっと手放したくないんだ“アイ”",
        "いつだって願いを歌えば　君に会える",
        "最高のステージ",
        "夢はもう譲れないんじゃない？",
        "零れたメモリを誘って",
        "Twilight to tell us",
        "Starlight to tell us",
        "終わりなんてない",
        "この手掴めば　また始まるんだ",
        "グシャグシャのまま描いた \"アイ\"",
        "It's all right！",
        "灯した歌は　君に届く",
        "躊躇いはない",
        "そう、一人じゃないから",
        "(鼓動、心、不可能を超えてゆけ)",
        "曖昧な夢さえも抱いて",
        "(踊る、震える、重なる想いだけ)",
        "あふれるストーリーに乗せて",
        "咲かせた未来のその先へ",
      ];

      const phraseTimings: Array<{ start: number; end: number }> = [];
      let phrase = video.firstPhrase;
      while (phrase) {
        let word = phrase.firstWord;
        let phraseStart = Number.POSITIVE_INFINITY;
        let phraseEnd = 0;
        let hasWord = false;
        while (word) {
          const text = (word.text ?? '').toString().normalize('NFC').trim();
          const startTime = typeof word.startTime === 'number' ? word.startTime : 0;
          const endTime = typeof word.endTime === 'number' ? word.endTime : startTime;

          // TextAlive では曲頭前のアップビートに負のタイムスタンプが入ることがあるためスキップ
          if (startTime >= 0 && text) {
            hasWord = true;
            phraseStart = Math.min(phraseStart, startTime);
            phraseEnd = Math.max(phraseEnd, Math.max(endTime, startTime + 10));
          }
          word = word.next;
        }
        if (hasWord && Number.isFinite(phraseStart)) {
          phraseTimings.push({ start: phraseStart, end: phraseEnd });
        }
        phrase = phrase.next;
      }

      const count = Math.min(scriptedLines.length, phraseTimings.length);
      for (let i = 0; i < count; i++) {
        const text = scriptedLines[i].normalize('NFC');
        const timing = phraseTimings[i];
        const baseDuration = timing.end - timing.start;
        const paddedDuration = baseDuration + 1000; // ゆとりを追加
        const duration = Math.max(paddedDuration, text.length * 400, 2200);
        this.lyricsData.push({
          time: timing.start,
          endTime: timing.start + duration,
          text,
          displayDuration: duration,
          originalChars: [{ text, timeOffset: 0 }],
        });
      }

      // 重複する歌詞（同じ時間、同じテキスト）を除外して、表示されるバブル数と分母を一致させる
      const uniqueLyrics = [];
      const seen = new Set();
      for (const item of this.lyricsData) {
        const key = `${item.time}_${item.text}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLyrics.push(item);
        }
      }
      this.lyricsData = uniqueLyrics;

      // Calculate score per hit for 1,000,000 max score
      const totalNotes = this.lyricsData.length;
      this.scorePerHit = totalNotes > 0 ? 1000000 / totalNotes : 0;
      console.log(`[GameManager] Total notes (unique): ${totalNotes}, Score per hit: ${this.scorePerHit}`);

      // TextAliveプレーヤー利用時は onFinish イベントでのみリザルト表示する
      // （ユーザー要望：曲が完全に終わったらリザルト画面へ）
      // フォールバック時のみ安全のためのタイマーを設定する
      if (!this.player || !this.isPlayerInit) {
        if (this.player?.video?.duration) {
          console.log("曲の長さ:", this.player.video.duration, "ms");
          const extraTime = this.currentMode === 'body' ? 5000 : 0; // ボディモードのカウントダウン猶予
          const bufferTime = this.currentMode === 'body' ? 5000 : 0; // 念のためのバッファ
          this.setupResultCheckTimer(this.player.video.duration + extraTime + bufferTime);
        } else {
          console.log("曲の長さが取得できません。デフォルトタイマーを設定 (フォールバック)");
          const defaultTime = this.currentMode === 'body' ? 120000 : 90000;
          this.setupResultCheckTimer(defaultTime);
        }
      } else {
        console.log('TextAlive使用中: resultCheckTimerは設定せず onFinish を待機');
        this.clearResultTimers();
      }
    } catch (e) {
      console.error("歌詞処理エラー:", e);
      this.fallback();
    }
  }

  /**
   * 歌詞の表示を更新する
   * 現在の再生位置に応じて表示すべき歌詞を判定
   */
  updateLyrics(position: number): void {
    // 一時停止中、初回インタラクション前、またはボディモードのカウントダウン中は歌詞を表示しない
    if (this.isPaused || this.isFirstInteraction || this.bodyDetection.isCountdownActive()) return;

    // 大きくジャンプした場合はインデックスを同期して一括表示を防ぐ
    if (Math.abs(position - this._lastLyricsPosition) > 1200) {
      this.syncLyricIndexToPosition(position);
    }

    // 再生位置が巻き戻った場合は歌詞インデックスを再同期
    if (this._lastLyricsPosition != null && position < this._lastLyricsPosition - 1000) {
      this.syncLyricIndexToPosition(position);
      // 巻き戻し時は表示済みリストをクリア
      this.displayedLyrics.clear();
    }
    this._lastLyricsPosition = position;

    if (this._lyricScanIndex == null) this._lyricScanIndex = 0;
    const len = this.lyricsData.length;
    
    // パフォーマンス対策: 1フレームあたりの処理数を制限（フリーズ防止）
    let processedCount = 0;
    const maxProcessPerFrame = 1; // 1フレームで最大1個だけ処理し、過剰表示を防ぐ
    
    // 歌詞が時間順である前提（TextAliveの特性）
    while (this._lyricScanIndex < len && processedCount < maxProcessPerFrame) {
      const l = this.lyricsData[this._lyricScanIndex];
      
      // 未来の歌詞ならば処理終了
      if (l.time > position + 200) break;
      
      // 一意なキーを生成（時刻ベース - 重複を確実に防ぐ）
      const lyricKey = `${l.time}_${l.text}`;
      
      // 既に表示済みの場合はスキップ
      if (this.displayedLyrics.has(lyricKey)) {
        this._lyricScanIndex++;
        continue;
      }
      
      // 現在時刻から-200ms～+200msの範囲の歌詞のみ表示
      // ※範囲を広げすぎると曲終盤で大量表示される
      if (l.time >= position - 200 && l.time <= position + 200) {
        // 直前のスポーンから一定時間空けてバースト表示を防ぐ
        const now = performance.now();
        if (now - this.lastLyricSpawnAt < 350) break;

        this.displayLyric(l);
        this.lastLyricSpawnAt = now;
        this.displayedLyrics.add(lyricKey);
        
        // 一定時間後に表示済みフラグを削除（メモリリーク防止）
        setTimeout(() => {
          this.displayedLyrics.delete(lyricKey);
        }, 10000); // 10秒後に削除
        
        processedCount++;
      }
      
      this._lyricScanIndex++;
    }
  }

  /**
   * 現在位置に最も近い歌詞インデックスへ同期する
   */
  syncLyricIndexToPosition(position: number): void {
    if (!this.lyricsData || this.lyricsData.length === 0) {
      this._lyricScanIndex = 0;
      return;
    }
    // 二分探索でpositionに対応する先頭インデックスを探す
    let lo = 0, hi = this.lyricsData.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.lyricsData[mid].time <= position) lo = mid + 1; else hi = mid;
    }
    // lo は position を超える最初の要素の位置 → 直前の歌詞から再開
    this._lyricScanIndex = Math.max(0, lo - 1);
  }


  /**
   * 歌詞表示タイマーを開始
   * フォールバックモード用の歌詞タイミング処理
   */
  startLyricsTimer(): void {
    if (!this.useFallback) return;
    this.currentLyricIndex = 0;
    this.startTime = Date.now();
    this.songStartTime = Date.now();
    this._lyricScanIndex = 0;
    this.fallbackStartTime = performance.now();
    this.playbackPosition = 0;
    this.lastLyricSpawnAt = 0;
    this.minResultTimestamp = Date.now() + 4000;
  }

  /**
   * 1文字の歌詞を表示
   * 画面上にランダムな位置で歌詞を表示
   * 
   * @param {string} text - 表示する文字
   */
  displayLyric(lyric: LyricData): HTMLElement | undefined {
  return this.lyricsRenderer.displayLyric(lyric);
  }

  prepareBubbleForLyric(bubble: HTMLElement, lyric: LyricData): void {
    // ホールド完了までの時間は2秒固定
    const holdDuration = 2000;
    this.holdStates.set(bubble, {
      progress: 0,
      scoredProgress: 0,
      duration: holdDuration,
      pointerHolding: false,
      autoHolding: false,
      isComplete: false,
      text: String(lyric.text || '').normalize('NFC'),
    });
    bubble.style.setProperty('--hold-progress', '0%');
    bubble.style.setProperty('--progress-visible', '0');
    bubble.style.animationPlayState = 'running';
    this.updateLyricSyncDisplay(lyric.text || '');
  }

  private updateLyricSyncDisplay(text: string): void {
    if (!this.lyricSyncText) return;
    this.lyricSyncText.textContent = text;
    this.lyricSyncText.classList.remove('cleared');
    this.lyricSyncText.style.opacity = '1';
    if (this.lyricSyncTimer != null) {
      clearTimeout(this.lyricSyncTimer);
    }
    this.lyricSyncTimer = window.setTimeout(() => {
      if (this.lyricSyncText) {
        this.lyricSyncText.classList.remove('cleared');
        this.lyricSyncText.textContent = '';
      }
      this.lyricSyncTimer = null;
    }, 8000);
  }

  private markLyricSyncCleared(): void {
    if (!this.lyricSyncText) return;
    this.lyricSyncText.classList.add('cleared');
  }

  releaseBubble(element: HTMLElement): void {
    this.activeLyricBubbles.delete(element);
    this.displayedViewerLyrics.delete(element);
    this.bubblePool.release(element);
    this.bubbleBounds.delete(element);
    this.holdStates.delete(element);
    if (this.activePointerHold === element) this.activePointerHold = null;
    if (this.autoHoldTarget === element) this.autoHoldTarget = null;
  }

  clearActiveBubbles(): void {
    const actives = Array.from(this.activeLyricBubbles);
    actives.forEach(bubble => this.releaseBubble(bubble));
    this.activeLyricBubbles.clear();
    this.bubbleBounds.clear();
    this.holdStates.clear();
    this.activePointerHold = null;
    this.autoHoldTarget = null;
  }

  updateBubbleBounds(element: HTMLElement): void {
    if (!element.isConnected) return;
    const rect = element.getBoundingClientRect();
    const radius = Math.max(rect.width, rect.height) / 2;
    this.bubbleBounds.set(element, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius,
    });
  }

  private refreshBubbleBounds(elapsed: number): void {
    if (elapsed - this.lastBoundsUpdate < 32) return;
    this.lastBoundsUpdate = elapsed;
    this.activeLyricBubbles.forEach(bubble => this.updateBubbleBounds(bubble));
  }

  private updateHoldStates(delta: number): void {
    if (this.isPaused || this.isFirstInteraction || this.bodyDetection.isCountdownActive()) return;
    this.holdStates.forEach((state, bubble) => {
      if (state.isComplete) return;
      if (state.pointerHolding || state.autoHolding) {
        const nextProgress = Math.min(1, state.progress + delta / state.duration);
        const scoreProgressDelta = Math.max(0, nextProgress - state.scoredProgress);
        if (scoreProgressDelta > 0 && this.scorePerHit) {
          this.score += this.scorePerHit * scoreProgressDelta;
          if (this.score > 1000000) this.score = 1000000;
          state.scoredProgress = nextProgress;
          this.scoreEl.textContent = String(Math.round(this.score));
        }
        state.progress = nextProgress;
        bubble.style.setProperty('--hold-progress', `${(nextProgress * 100).toFixed(1)}%`);
        bubble.style.setProperty('--progress-visible', '1');
        bubble.style.animationPlayState = 'paused';
        if (nextProgress >= 1) {
          this.completeBubbleHold(bubble, state);
        }
      }
    });
  }

  private completeBubbleHold(bubble: HTMLElement, state?: HoldState): void {
    const holdState = state ?? this.holdStates.get(bubble);
    if (!holdState || holdState.isComplete) return;
    holdState.isComplete = true;
    holdState.pointerHolding = false;
    holdState.autoHolding = false;
    bubble.style.setProperty('--hold-progress', '100%');
    bubble.style.setProperty('--progress-visible', '1');
    bubble.style.animationPlayState = 'running';
    bubble.classList.remove('holding');
    bubble.style.zIndex = bubble.dataset.prevZ || '';
    delete bubble.dataset.prevZ;
    this.clickLyric(bubble);
    this.markLyricSyncCleared();
    if (this.autoHoldTarget === bubble) this.autoHoldTarget = null;
    if (this.activePointerHold === bubble) this.activePointerHold = null;
    this.holdStates.delete(bubble);
  }

  private shouldEnableFpsCounter(): boolean {
    try {
      const params = new URLSearchParams(window.location.search);
      const debugParam = params.get('debug');
      if (debugParam && debugParam.split(',').map(token => token.trim().toLowerCase()).includes('fps')) {
        return true;
      }
      return window.location.hash.toLowerCase().includes('fps');
    } catch {
      return false;
    }
  }

  private createFpsOverlay(): void {
    if (this.fpsOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'fps-counter';
    overlay.textContent = 'FPS --';
    overlay.style.position = 'fixed';
    overlay.style.top = '12px';
    overlay.style.right = '16px';
    overlay.style.zIndex = '2000';
    overlay.style.padding = '6px 10px';
    overlay.style.background = 'rgba(0, 0, 0, 0.6)';
    overlay.style.color = '#39c5bb';
    overlay.style.fontFamily = 'monospace';
    overlay.style.fontSize = '13px';
    overlay.style.borderRadius = '6px';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);
    this.fpsOverlay = overlay;
  }

  private updateFpsDisplay(delta: number, elapsed: number): void {
    if (!this.fpsOverlay || delta <= 0) return;
    const fps = 1000 / delta;
    this.fpsSamples.push(fps);
    if (this.fpsSamples.length > 60) this.fpsSamples.shift();
    if (elapsed - this.lastFpsUpdate < 250) return;
    const average = this.fpsSamples.reduce((sum, value) => sum + value, 0) / this.fpsSamples.length;
    this.fpsOverlay.textContent = `FPS ${average.toFixed(1)}`;
    this.lastFpsUpdate = elapsed;
  }

  public cancelFinishGuards(): void {
    this.timers.clearTimer(TIMER_KEYS.FinishWatch);
    this.timers.clearTimer(TIMER_KEYS.FinishFallback);
  }

  private startFinishGuards(): void {
    if (!this.player) return;
    this.cancelFinishGuards();

    this.timers.setInterval(TIMER_KEYS.FinishWatch, () => {
      if (!this.player || !this.player.video || this.resultsDisplayed) return;
      const duration = this.player.video.duration;
      const pos = this.player.timer.position;
      if (!duration || pos < duration - 500) return;

      setTimeout(() => {
        if (!this.resultsDisplayed && this.player && this.player.timer.position >= duration - 200) {
          console.log('フォールバック監視によるリザルト表示');
          this.showResults();
        }
      }, 600);
      this.timers.clearTimer(TIMER_KEYS.FinishWatch);
    }, 1000);

    const duration = this.player.video?.duration;
    const extra = this.currentMode === 'body' ? 5000 : 0;
    const fallbackDelay = (duration ?? 120000) + (duration ? extra + 3000 : 0);

    this.timers.setTimeout(TIMER_KEYS.FinishFallback, () => {
      if (!this.resultsDisplayed) {
        console.warn('finishFallbackTimeout発火: onFinish未検出のためリザルト表示');
        this.showResults();
      }
    }, fallbackDelay);
  }

  private handlePoseResults(landmarks?: Landmark[]): void {
    if (!landmarks) return;
    const flippedLandmarks = landmarks.map(landmark => ({ ...landmark, x: 1 - landmark.x }));
    if (this.visuals) {
      this.visuals.updatePlayerAvatar(flippedLandmarks);
    }
    if (this.currentMode === 'body') {
      this.bodyDetection.evaluateLandmarks(flippedLandmarks);
    }

    // 手の判定点 (右手、左手)
    // 15: left wrist, 16: right wrist
    const checkPoints = [15, 16]
      .map(index => flippedLandmarks[index])
      .filter(p => p && p.visibility && p.visibility > 0.5);

    const newBodyHolds = new Set<HTMLElement>();
    const hitRadius = 40; // 判定半径

    for (const point of checkPoints) {
      const px = point.x * window.innerWidth;
      const py = point.y * window.innerHeight;

      for (const el of this.activeLyricBubbles) {
        if (el.style.pointerEvents === 'none') continue;
        const bounds = this.bubbleBounds.get(el);
        if (!bounds) continue;

        const dx = px - bounds.x;
        const dy = py - bounds.y;
        const dist2 = dx * dx + dy * dy;
        
        if (dist2 <= (hitRadius + bounds.radius) ** 2) {
          newBodyHolds.add(el);
        }
      }
    }

    // 新しくホールドされたもの
    for (const el of newBodyHolds) {
      if (!this.currentBodyHolds.has(el)) {
        this.startBubbleHold(el, 'auto');
      }
    }

    // ホールドが外れたもの
    for (const el of this.currentBodyHolds) {
      if (!newBodyHolds.has(el)) {
        this.stopBubbleHold(el, 'auto');
      }
    }

    this.currentBodyHolds = newBodyHolds;
  }

  /**
   * 鑑賞用歌詞を表示（重複文字に強い：要素キー）
   * @param {string} text - 表示する文字
   * @param {HTMLElement} gameBubble - ゲーム用歌詞要素
   */
  displayViewerLyric(text: string, gameBubble: HTMLElement): void {
  return this.lyricsRenderer.displayViewerLyric(text, gameBubble);
  }

  /**
   * マウス/指の位置と歌詞の当たり判定
   */
  checkLyrics(x: number, y: number, radius: number): void {
    if (this.isFirstInteraction) return;

    // 優先ホールド判定: 既にホールド中の対象が有効範囲内ならターゲットを変更しない（誤って隣のバブルに移らないようにする）
    if (this.autoHoldTarget && this.activeLyricBubbles.has(this.autoHoldTarget)) {
      const bounds = this.bubbleBounds.get(this.autoHoldTarget);
      if (bounds && this.autoHoldTarget.style.pointerEvents !== 'none') {
        const dx = x - bounds.x;
        const dy = y - bounds.y;
        const dist2 = dx * dx + dy * dy;
        // 判定内であれば継続（少し余裕を持たせても良いが、一旦radius+bounds.radiusで判定）
        if (dist2 <= (radius + bounds.radius) ** 2) {
          this.startBubbleHold(this.autoHoldTarget, 'pointer');
          return;
        }
      }
    }

    let closest: { el: HTMLElement; dist2: number } | null = null;
    for (const el of this.activeLyricBubbles) {
      if (el.style.pointerEvents === 'none') continue; // 既に処理済みの場合はスキップ
      const bounds = this.bubbleBounds.get(el);
      if (!bounds) continue;
      const dx = x - bounds.x;
      const dy = y - bounds.y;
      const dist2 = dx * dx + dy * dy;
      const hit = dist2 <= (radius + bounds.radius) ** 2;
      if (hit) {
        if (!closest || dist2 < closest.dist2) {
          closest = { el, dist2 };
        }
      }
    }

    if (!closest) {
      if (this.autoHoldTarget) {
        this.stopBubbleHold(this.autoHoldTarget, 'pointer');
        this.autoHoldTarget = null;
      }
      return;
    }

    if (this.autoHoldTarget && this.autoHoldTarget !== closest.el) {
      this.stopBubbleHold(this.autoHoldTarget, 'pointer');
    }
    this.autoHoldTarget = closest.el;
    this.startBubbleHold(closest.el, 'pointer');
  }



  /**
   * 歌詞をクリック/タッチした時の処理
   * スコア加算と視覚効果を処理
   */
  startBubbleHold(bubble: HTMLElement, source: HoldSource): void {
    if (bubble.style.pointerEvents === 'none') return;
    const state = this.holdStates.get(bubble);
    if (!state || state.isComplete) return;
    if (!bubble.dataset.prevZ) {
      bubble.dataset.prevZ = bubble.style.zIndex || '';
    }
    bubble.style.zIndex = '100';
    if (source === 'pointer') {
      this.activePointerHold = bubble;
      state.pointerHolding = true;
    } else {
      state.autoHolding = true;
    }
    bubble.style.animationPlayState = 'paused';
    bubble.style.setProperty('--progress-visible', '1');
    bubble.classList.add('holding');
  }

  stopBubbleHold(bubble: HTMLElement, source: HoldSource): void {
    const state = this.holdStates.get(bubble);
    if (!state) return;
    if (source === 'pointer') {
      state.pointerHolding = false;
      if (this.activePointerHold === bubble) this.activePointerHold = null;
    } else {
      state.autoHolding = false;
      if (this.autoHoldTarget === bubble) this.autoHoldTarget = null;
    }

    if (!state.pointerHolding && !state.autoHolding && !state.isComplete) {
      state.progress = 0;
      bubble.style.setProperty('--hold-progress', '0%');
      bubble.style.animationPlayState = 'running';
      bubble.style.setProperty('--progress-visible', '0');
      bubble.classList.remove('holding');
      bubble.style.zIndex = bubble.dataset.prevZ || '';
      delete bubble.dataset.prevZ;
    }
  }

  stopActivePointerHold(): void {
    if (this.activePointerHold) {
      this.stopBubbleHold(this.activePointerHold, 'pointer');
    }
  }

  clickLyric(element: HTMLElement): void {
    if (element.style.pointerEvents === 'none') return;
    
    // スコアとコンボを更新
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    
    // 最終ノーツ（フルコンボ）の場合は誤差補正して確実に1,000,000点にする
    if (this.lyricsData && this.combo === this.lyricsData.length) {
      this.score = 1000000;
      console.log('Full Combo! Score corrected to 1,000,000');
    }

    console.log(`Hit! Combo: ${this.combo}, Score: ${this.score}`);
    
    // 表示を更新
    this.scoreEl.textContent = String(Math.round(this.score));
    this.comboEl.textContent = `コンボ: ${this.combo}`;
    this.markLyricSyncCleared();
    
    // 視覚効果
    element.style.color = '#FF69B4'; // ピンク色に変更
    this.createClickEffect(element);
    const hitBounds = this.bubbleBounds.get(element);
    if (hitBounds) {
      this.createHitEffect(hitBounds.x, hitBounds.y);
    }
    element.style.pointerEvents = 'none'; // 再クリック防止
    
    // フェードアウト
  setTimeout(() => element.style.opacity = '0', 100);
    this.lastScoreTime = Date.now();

    // 対応する鑑賞用歌詞もハイライト（要素キー）
    if (this.enableViewerLyrics) {
      const viewerEl = this.displayedViewerLyrics.get(element);
      if (viewerEl) {
        viewerEl.classList.add('highlighted');
      }
    }
  // アクティブ集合から外す（次の判定から除外）
  this.activeLyricBubbles.delete(element);
  }

  /**
   * クリック時のパーティクル効果を生成
   * 
   * @param {HTMLElement} element - クリックされた要素
   */
  createClickEffect(element: HTMLElement): void {
  // SRP: EffectsManagerに委譲
  return this.effects.createClickEffect(element);
  }

  /**
   * タップ/クリック時の波紋効果を生成
   * 
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  createHitEffect(x: number, y: number): void {
  // SRP: EffectsManagerに委譲
  return this.effects.createHitEffect(x, y);
  }

  /**
   * 強制的にゲームを終了し、リザルト画面を表示する（デバッグ用）
   */
  forceEndGame() {
    if (this.resultReported) return;
    
    console.log('Force ending game (Debug)');
    this.isDebugMode = true;
    this.isPlaying = false;
    this.gameLoop.stop();
    this.player?.requestStop();
    
    // 現在のスコアとコンボを維持してリザルトへ
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.combo = 0;
    
    this.showResults();
  }

  /**
   * リザルト画面を表示する
   * スコアとランクを表示し、演出を実行
   */
  showResults() {
  if (Date.now() < this.minResultTimestamp) {
    console.log('リザルト表示を抑制（早すぎるため）');
    return;
  }
  return this.resultsManager.showResults();
  }
  
  /**
   * リザルト画面のボタンイベントを設定
   */
  setupResultsButtons() {
  return this.resultsManager.setupResultsButtons();
  }

  /**
   * リソースの解放とクリーンアップ
   * ゲーム終了時に呼び出す
   */
  cleanup(): void {
  // 観客のランダムテキスト機能は削除
    this.timers.clearAll();
    this.gameLoop.stop();
    
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
    if (this.viewerLyricsContainer) {
      this.viewerLyricsContainer.innerHTML = '';
    }
      this.clearActiveBubbles();
    this.displayedViewerLyrics.clear();
    if (this.lyricSyncTimer != null) {
      clearTimeout(this.lyricSyncTimer);
      this.lyricSyncTimer = null;
    }
    if (this.lyricSyncText) {
      this.lyricSyncText.textContent = '';
      this.lyricSyncText.classList.remove('cleared');
    }

    if (this.fpsOverlay?.parentElement) {
      this.fpsOverlay.parentElement.removeChild(this.fpsOverlay);
    }
    this.fpsOverlay = null;
    this.fpsSamples = [];
  }
}

class LiveStageVisuals {
  private container: HTMLElement
  private scene!: THREE.Scene
  private camera!: THREE.PerspectiveCamera
  private renderer!: THREE.WebGLRenderer
  private playerAvatar: PlayerAvatar = {}
  private activeHandJoints: THREE.Mesh[] = []
  private palmJointPool: THREE.Mesh[] = []
  private tipJointPool: THREE.Mesh[] = []
  private leftPenlight!: THREE.Mesh
  private rightPenlight!: THREE.Mesh
  private static jointGeometry: THREE.SphereGeometry | null = null
  private static jointMaterial: THREE.MeshBasicMaterial | null = null
  private static boneMaterial: THREE.LineBasicMaterial | null = null
  private static penlightGeometry: THREE.CylinderGeometry | null = null
  private static penlightMaterial: THREE.MeshBasicMaterial | null = null
  private static palmJointGeometry: THREE.SphereGeometry | null = null
  private static tipJointGeometry: THREE.SphereGeometry | null = null

  constructor(container: HTMLElement) {
    this.container = container;
    this.initThreeJS();
    // render() は GameManager の GameLoop から呼び出すため、自己再帰 animate() は使用しない
  }

  initThreeJS(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    this.camera.position.set(0, 100, 150);

    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '2'; // UIの下、背景の上
    this.container.appendChild(this.renderer.domElement);

    // リサイズイベントの設定
    window.addEventListener('resize', () => this.onResize());

    // 手の描画用配列を初期化済み

    const penlightGeometry = LiveStageVisuals.getPenlightGeometry();
    const penlightMaterial = LiveStageVisuals.getPenlightMaterial();
    this.leftPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
    this.rightPenlight = new THREE.Mesh(penlightGeometry, penlightMaterial);
  }

  setVideoTexture(videoElement: HTMLVideoElement): void {
    const videoTexture = new THREE.VideoTexture(videoElement);
    videoTexture.wrapS = THREE.RepeatWrapping;
    videoTexture.repeat.x = -1;
    this.scene.background = videoTexture;
  }

  updatePlayerAvatar(landmarks: Landmark[]): void {
    if (!this.playerAvatar.joints) {
      this.playerAvatar.joints = {};
      this.playerAvatar.bones = {};

      const connections = POSE_CONNECTIONS;
      for (let i = 0; i < connections.length; i++) {
        const pair = connections[i];
        const start = pair[0];
        const end = pair[1];

        if (!this.playerAvatar.joints[start]) {
          const jointGeometry = LiveStageVisuals.getJointGeometry();
          const jointMaterial = LiveStageVisuals.getJointMaterial();
          this.playerAvatar.joints[start] = new THREE.Mesh(jointGeometry, jointMaterial);
          this.scene.add(this.playerAvatar.joints[start]);
        }
        if (!this.playerAvatar.joints[end]) {
          const jointGeometry = LiveStageVisuals.getJointGeometry();
          const jointMaterial = LiveStageVisuals.getJointMaterial();
          this.playerAvatar.joints[end] = new THREE.Mesh(jointGeometry, jointMaterial);
          this.scene.add(this.playerAvatar.joints[end]);
        }

        const boneGeometry = new THREE.BufferGeometry();
        boneGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
        this.playerAvatar.bones[i] = new THREE.Line(boneGeometry, LiveStageVisuals.getBoneMaterial());
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
      if (!pair) continue;
      const start = pair[0];
      const end = pair[1];
      const bone = this.playerAvatar.bones?.[i];
      const startJoint = this.playerAvatar.joints?.[start];
      const endJoint = this.playerAvatar.joints?.[end];
      if (bone && startJoint && endJoint) {
        const positions = bone.geometry.attributes.position.array as Float32Array;
        positions[0] = startJoint.position.x;
        positions[1] = startJoint.position.y;
        positions[2] = startJoint.position.z;
        positions[3] = endJoint.position.x;
        positions[4] = endJoint.position.y;
        positions[5] = endJoint.position.z;
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

  updateHandLandmarks(handsResults: { multiHandLandmarks?: Array<Landmark[]> }): void {
    this.recycleHandJoints();
    if (!handsResults.multiHandLandmarks) return;

    handsResults.multiHandLandmarks.forEach((landmarks: Landmark[], handIndex: number) => {
      // 手のひらの中心（ランドマーク0）を大きな球体で表示
      const palmLandmark = landmarks[0];
      const palmJoint = this.acquireHandJoint('palm');
      this.updateHandJointAppearance(palmJoint, handIndex === 0 ? 0x39c5bb : 0xff6b6b, 0.8);
      this.positionHandJoint(palmJoint, palmLandmark, -800);
      this.activeHandJoints.push(palmJoint);

      // 人差し指の先端（ランドマーク8）を小さな球体で表示
      const fingerTip = landmarks[8];
      const tipJoint = this.acquireHandJoint('tip');
      this.updateHandJointAppearance(tipJoint, 0xffffff, 0.9);
      this.positionHandJoint(tipJoint, fingerTip, -800);
      this.activeHandJoints.push(tipJoint);
    });
  }

  private recycleHandJoints(): void {
    if (this.activeHandJoints.length === 0) return;
    this.activeHandJoints.forEach(mesh => this.releaseHandJoint(mesh));
    this.activeHandJoints.length = 0;
  }

  private acquireHandJoint(type: 'palm' | 'tip'): THREE.Mesh {
    const pool = type === 'palm' ? this.palmJointPool : this.tipJointPool;
    let mesh = pool.pop();
    if (!mesh) {
      const geometry = type === 'palm' ? LiveStageVisuals.getPalmGeometry() : LiveStageVisuals.getTipGeometry();
      mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true }));
      mesh.userData.handJointType = type;
      this.scene.add(mesh);
    }
    mesh.visible = true;
    return mesh;
  }

  private releaseHandJoint(mesh: THREE.Mesh): void {
    mesh.visible = false;
    const type = mesh.userData.handJointType === 'tip' ? 'tip' : 'palm';
    const pool = type === 'palm' ? this.palmJointPool : this.tipJointPool;
    pool.push(mesh);
  }

  private positionHandJoint(mesh: THREE.Mesh, landmark: Landmark, depthScale: number): void {
    mesh.position.x = (landmark.x - 0.5) * -window.innerWidth;
    mesh.position.y = (1 - landmark.y) * window.innerHeight - (window.innerHeight / 2);
    mesh.position.z = (landmark.z || 0) * depthScale;
  }

  private updateHandJointAppearance(mesh: THREE.Mesh, color: number, opacity: number): void {
    const material = mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(color);
    material.opacity = opacity;
  }

  /**
   * 1フレーム分のレンダリングを実行。
   * GameManager の GameLoop から呼ばれる（自己再帰ではない）。
   */
  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private static getJointGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.jointGeometry) {
      LiveStageVisuals.jointGeometry = new THREE.SphereGeometry(5, 32, 32);
    }
    return LiveStageVisuals.jointGeometry;
  }

  private static getJointMaterial(): THREE.MeshBasicMaterial {
    if (!LiveStageVisuals.jointMaterial) {
      LiveStageVisuals.jointMaterial = new THREE.MeshBasicMaterial({ color: 0x39c5bb });
    }
    return LiveStageVisuals.jointMaterial;
  }

  private static getBoneMaterial(): THREE.LineBasicMaterial {
    if (!LiveStageVisuals.boneMaterial) {
      LiveStageVisuals.boneMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 5 });
    }
    return LiveStageVisuals.boneMaterial;
  }

  private static getPenlightGeometry(): THREE.CylinderGeometry {
    if (!LiveStageVisuals.penlightGeometry) {
      LiveStageVisuals.penlightGeometry = new THREE.CylinderGeometry(2, 2, 40, 32);
    }
    return LiveStageVisuals.penlightGeometry;
  }

  private static getPenlightMaterial(): THREE.MeshBasicMaterial {
    if (!LiveStageVisuals.penlightMaterial) {
      LiveStageVisuals.penlightMaterial = new THREE.MeshBasicMaterial({ color: 0x39c5bb, transparent: true, opacity: 0.8 });
    }
    return LiveStageVisuals.penlightMaterial;
  }

  private static getPalmGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.palmJointGeometry) {
      LiveStageVisuals.palmJointGeometry = new THREE.SphereGeometry(15, 32, 32);
    }
    return LiveStageVisuals.palmJointGeometry;
  }

  private static getTipGeometry(): THREE.SphereGeometry {
    if (!LiveStageVisuals.tipJointGeometry) {
      LiveStageVisuals.tipJointGeometry = new THREE.SphereGeometry(8, 16, 16);
    }
    return LiveStageVisuals.tipJointGeometry;
  }
}

type BodyDetectionDeps = {
  game: GameManager
  timers: TimerManager
}

/**
 * BodyDetectionManager
 * 全身検出・カウントダウン・警告表示の責務をまとめて担当するクラス
 * GameManager本体は状態管理とモード切替に専念できるようになる
 */
// SRP: フェイス検出の責務を担当するクラス
class FaceDetectionManager {
  private readonly game: GameManager
  private faceMesh: any | null = null
  private readonly input: InputManager

  constructor(game: GameManager) {
    this.game = game;
    // InputManagerはGameManagerのpublicプロパティとしてアクセスできる想定だが、
    // コンストラクタ呼び出し順序の関係で、ここではGameManagerインスタンス経由でアクセスする
    // ただしInputManagerはGameManagerコンストラクタ内で生成されるため、このクラスのメソッド呼び出し時には存在するはず
    this.input = game.input;
  }

  init(): void {
    if (!this.game.isFaceMode()) return;

    if (!window.FaceMesh) {
      console.error('MediaPipe FaceMesh not loaded');
      return;
    }

    this.faceMesh = new window.FaceMesh({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    this.faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    this.faceMesh.onResults((results: any) => this.handleFaceResults(results));
  }

  close(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
      this.faceMesh = null;
    }
  }

  async send(frame: any): Promise<void> {
    if (this.faceMesh) {
      await this.faceMesh.send(frame);
    }
  }

  private handleFaceResults(results: any): void {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];
    // 上唇: 13, 下唇: 14
    // 基準とする顔の高さ: 10 (top) - 152 (chin)
    // 座標は0.0-1.0で返ってくる

    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const faceTop = landmarks[10];
    const chin = landmarks[152];
    const nose = landmarks[4]; // 鼻の頭をカーソル位置とする

    if (!upperLip || !lowerLip || !faceTop || !chin || !nose) return;

    // 開口率を計算
    const mouthOpenDist = Math.abs(lowerLip.y - upperLip.y);
    const faceHeight = Math.abs(chin.y - faceTop.y);
    const openRatio = mouthOpenDist / faceHeight;
    const isOpen = openRatio > 0.05;

    // 口の中心座標を計算
    const mouthX = (upperLip.x + lowerLip.x) / 2;
    const mouthY = (upperLip.y + lowerLip.y) / 2;

    // 座標を画面座標に変換 (左右反転を考慮)
    const screenX = (1 - mouthX) * window.innerWidth;
    const screenY = mouthY * window.innerHeight;

    // カーソル位置を更新
    this.game.lastMousePos = { x: screenX, y: screenY };

    // フェイスモード改修: 「開いた口の位置」でホールド
    if (isOpen) {
      this.game.checkLyrics(screenX, screenY, 5);
    } else {
      // 口を閉じている場合はホールド解除判定のために画面外の座標を渡す
      this.game.checkLyrics(-9999, -9999, 0);
    }
  }
}

class BodyDetectionManager {
  private readonly game: GameManager
  private readonly timers: TimerManager
  private ready = false

  constructor({ game, timers }: BodyDetectionDeps) {
    this.game = game;
    this.timers = timers;
  }

  /** 全身が映って再生を開始できる状態か */
  isReady(): boolean {
    return this.ready;
  }

  /** カウントダウン中かどうか（歌詞出現を一時停止するために利用） */
  isCountdownActive(): boolean {
    return this.timers.has(TIMER_KEYS.BodyCountdown);
  }

  /** リスタート時などに検出状態と警告を完全リセット */
  reset(): void {
    this.ready = false;
    this.cancelCountdown();
    this.cancelFullBodyWarning();
  }

  /** 再生ボタン押下時に全身調整メッセージを提示 */
  remindAdjustment(): void {
    if (!this.game.isBodyWarningEnabled()) {
      this.hideCountdownOverlay();
      return;
    }
    this.game.countdownOverlay.classList.remove('hidden');
    this.game.countdownText.textContent = '全身が映るように調整してください';
  }

  /** MediaPipeのランドマークを評価し、全身検出の状態を更新 */
  evaluateLandmarks(landmarks: Landmark[]): void {
    const requiredLandmarks = [0, 11, 12, 23, 24, 27, 28];
    const allDetected = requiredLandmarks.every(index => {
      const lm = landmarks[index];
      return lm && (lm.visibility ?? 0) > 0.8;
    });

    if (allDetected) {
      if (!this.isCountdownActive()) {
        this.hideCountdownOverlay();
      }
      this.cancelFullBodyWarning();
      if (!this.ready && !this.isCountdownActive()) {
        this.startCountdown();
      }
      return;
    }

    if (this.isCountdownActive()) {
      this.cancelCountdown('全身が映るように調整してください');
    }

    if (
      this.game.isBodyWarningEnabled() &&
      (this.ready || this.game.player?.isPlaying) &&
      !this.timers.has(TIMER_KEYS.FullBodyLost)
    ) {
      this.timers.setTimeout(TIMER_KEYS.FullBodyLost, () => {
        this.game.countdownOverlay.classList.remove('hidden');
        this.game.countdownText.textContent = '全身が画面から外れています！';
      }, 3000);
    }
  }

  private startCountdown(): void {
    let count = 5;
    this.game.countdownOverlay.classList.remove('hidden');
    this.game.countdownText.textContent = String(count);
    this.game.isPaused = true;
    this.game.isFirstInteraction = true;
    this.timers.setInterval(TIMER_KEYS.BodyCountdown, () => {
      count--;
      if (count > 0) {
        this.game.countdownText.textContent = String(count);
        return;
      }
      this.timers.clearTimer(TIMER_KEYS.BodyCountdown);
      this.ready = true;
      this.hideCountdownOverlay();
      void this.game.playMusic();
    }, 1000);
  }

  cancelCountdown(message?: string): void {
    if (!this.isCountdownActive()) return;
    this.timers.clearTimer(TIMER_KEYS.BodyCountdown);
    if (message && this.game.isBodyWarningEnabled()) {
      this.game.countdownOverlay.classList.remove('hidden');
      this.game.countdownText.textContent = message;
    } else {
      this.hideCountdownOverlay();
    }
  }

  cancelFullBodyWarning(): void {
    if (!this.timers.has(TIMER_KEYS.FullBodyLost)) return;
    this.timers.clearTimer(TIMER_KEYS.FullBodyLost);
    this.hideCountdownOverlay();
  }

  private hideCountdownOverlay(): void {
    this.game.countdownText.textContent = '';
    this.game.countdownOverlay.classList.add('hidden');
  }
}

// SRP: 歌詞のDOM表示と鑑賞用表示を担当
class LyricsRenderer {
  private readonly game: GameManager
  private readonly maxLyricsOnScreen = 50

  constructor(game: GameManager) {
    this.game = game;
  }

  private bindBubbleEvents(bubble: HTMLElement): void {
    if (bubble.dataset.bound === 'true') return;
    bubble.dataset.bound = 'true';
    bubble.addEventListener('mouseenter', this.handleBubbleHoldStart);
    bubble.addEventListener('touchstart', this.handleBubbleHoldStart, { passive: false });
    bubble.addEventListener('mouseleave', this.handleBubbleHoldEnd);
    bubble.addEventListener('mouseout', this.handleBubbleHoldEnd);
    bubble.addEventListener('touchend', this.handleBubbleHoldEnd);
    bubble.addEventListener('touchcancel', this.handleBubbleHoldEnd);
    bubble.addEventListener('animationend', this.handleBubbleAnimationEnd);
  }

  private handleBubbleHoldStart = (event: Event): void => {
    if (event.type === 'touchstart') event.preventDefault();
    if (this.game.isFaceMode()) return;
    const bubble = event.currentTarget as HTMLElement;
    this.game.startBubbleHold(bubble, 'pointer');
  }

  private handleBubbleHoldEnd = (event: Event): void => {
    if (this.game.isFaceMode()) return;
    const bubble = event.currentTarget as HTMLElement;
    this.game.stopBubbleHold(bubble, 'pointer');
  }

  private handleBubbleAnimationEnd = (event: AnimationEvent): void => {
    const bubble = event.currentTarget as HTMLElement;
    if (bubble.style.pointerEvents !== 'none') {
      this.game.combo = 0;
      this.game.comboEl.textContent = `コンボ: 0`;
    }
    this.game.releaseBubble(bubble);
  }

  private resetBubbleStyles(bubble: HTMLElement): void {
    bubble.removeAttribute('style');
    bubble.className = 'lyric-bubble';
    bubble.style.pointerEvents = 'auto';
    bubble.style.opacity = '1';
    bubble.style.display = '';
    bubble.style.animationPlayState = 'running';
    bubble.style.setProperty('--hold-progress', '0%');
    bubble.style.setProperty('--progress-visible', '0');
  }

  private placeBubble(bubble: HTMLElement, lyric: LyricData): void {
    const screenWidth = window.innerWidth;
    const isMobile = screenWidth <= 480;
    const xPercent = this.game.getSafeBubbleXPercent();
    const isLong = (lyric.text || '').length > 10;
    
    // フォントサイズ調整: モバイル時はサイズを統一
    const fontSize = isMobile 
      ? '12px' 
      : screenWidth <= 768 
        ? (isLong ? '22px' : '26px') 
        : (isLong ? '28px' : '32px');

    bubble.style.position = 'absolute';
    bubble.style.left = `${xPercent}%`;
    bubble.style.bottom = '-60px';
    bubble.style.transform = 'translateX(-50%)';
    bubble.style.color = '#39C5BB';
    bubble.style.fontSize = fontSize;
    
    // モバイル用: 折り返しを禁止しつつ、最大幅を設定（万が一用）
    if (isMobile) {
      bubble.style.whiteSpace = 'nowrap';
      bubble.style.maxWidth = '95vw';
    } else {
      bubble.style.whiteSpace = '';
      bubble.style.maxWidth = '';
    }

    this.game.gamecontainer.appendChild(bubble);

    // 位置補正: モバイル時は画面外にはみ出さないように強制補正
    if (isMobile) {
      const rect = bubble.getBoundingClientRect();
      const containerRect = this.game.gamecontainer.getBoundingClientRect();
      const bubbleHalfWidth = rect.width / 2;
      const padding = 10; // 画面端からの余裕
      
      const currentLeftPx = (xPercent / 100) * containerRect.width;
      let newLeftPx = currentLeftPx;

      // 左端チェック
      if (currentLeftPx - bubbleHalfWidth < padding) {
        newLeftPx = bubbleHalfWidth + padding;
      }
      // 右端チェック
      else if (currentLeftPx + bubbleHalfWidth > containerRect.width - padding) {
        newLeftPx = containerRect.width - bubbleHalfWidth - padding;
      }

      if (Math.abs(newLeftPx - currentLeftPx) > 1) {
        bubble.style.left = `${newLeftPx}px`;
      }
    }

    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = 'slotFloat var(--lyric-speed) linear forwards';
  }

  displayLyric(lyric: LyricData | null): HTMLElement | undefined {
    if (lyric == null || lyric.text == null) return;

    if (this.game.activeLyricBubbles.size >= this.maxLyricsOnScreen) {
      const iterator = this.game.activeLyricBubbles.values().next();
      if (!iterator.done) {
        this.game.releaseBubble(iterator.value as HTMLElement);
      }
    }

    const norm = String(lyric.text).normalize('NFC');
    const bubble = this.game.bubblePool.acquire();
    this.resetBubbleStyles(bubble);
    bubble.textContent = norm;
    this.bindBubbleEvents(bubble);
    this.placeBubble(bubble, lyric);
    this.game.prepareBubbleForLyric(bubble, lyric);

    this.game.activeLyricBubbles.add(bubble);
    this.game.updateBubbleBounds(bubble);

    if (this.game.enableViewerLyrics) {
      this.displayViewerLyric(norm, bubble);
    }

    return bubble;
  }

  displayViewerLyric(text: string, gameBubble: HTMLElement): void {
    if (!this.game.enableViewerLyrics || !this.game.viewerLyricsContainer) return;

    const viewerChar = document.createElement('span');
    viewerChar.className = 'viewer-lyric-char';
    viewerChar.textContent = String(text).normalize('NFC');
    viewerChar.style.opacity = '0';
    this.game.viewerLyricsContainer.appendChild(viewerChar);

    setTimeout(() => {
      viewerChar.style.opacity = '1';
      viewerChar.style.transform = 'translateY(0)';
    }, 50);

    this.game.displayedViewerLyrics.set(gameBubble, viewerChar);

    setTimeout(() => {
      viewerChar.style.opacity = '0';
      setTimeout(() => {
        if (viewerChar.parentNode) viewerChar.parentNode.removeChild(viewerChar);
        if (this.game.displayedViewerLyrics.get(gameBubble) === viewerChar) {
          this.game.displayedViewerLyrics.delete(gameBubble);
        }
      }, 1000);
    }, 8000);
  }
}

// SRP: リザルト画面の表示とボタン配線を担当
class ResultsManager {
  private game: GameManager
  private turnstileWidgetId: string | null

  constructor(game: GameManager) {
    this.game = game;
    this.turnstileWidgetId = null;
  }

  private clearTurnstileWidget(): void {
    if (this.turnstileWidgetId && (window as any).turnstile) {
      try { (window as any).turnstile.remove(this.turnstileWidgetId); } catch {}
    }
    this.turnstileWidgetId = null;
    const container = document.getElementById('turnstile-container');
    if (container) container.innerHTML = '';
  }

  showResults(): void {
    if (this.game.resultsDisplayed) {
      console.log('すでに結果画面が表示されています');
      return;
    }
    console.log('結果画面を表示します');
    this.game.resultsDisplayed = true;
    this.game.cancelFinishGuards();
    this.clearTurnstileWidget();

    if (this.game.player?.isPlaying) {
      try { this.game.player.requestPause(); } catch (e) { console.error('Results pause error:', e); }
    }

    this.game.cancelResultTimers();

    // 曲終了時に画面上の全ての歌詞を即座に削除（最適化版）
    console.log('画面上の歌詞を全て削除します');
    this.game.clearActiveBubbles();
    
    // 表示済みリストもクリア
    this.game.displayedLyrics.clear();
    this.game.displayedViewerLyrics.clear();

    this.game.maxCombo = Math.max(this.game.maxCombo || 0, this.game.combo);

    const rank = calculateRank(this.game.score);
    // onGameEnd call removed to delay submission until user interaction

    const resultsScreen = document.getElementById('results-screen');
    if (!resultsScreen) {
      console.error('結果画面のDOM要素が見つかりません');
      return;
    }

    const finalScoreDisplay = document.getElementById('final-score-display');
    const finalComboDisplay = document.getElementById('final-combo-display');
    const rankDisplay = document.getElementById('rank-display');
    const registerScoreBtn = document.getElementById('register-score') as HTMLButtonElement;
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    if (finalScoreDisplay) finalScoreDisplay.textContent = String(Math.round(this.game.score));
    if (finalComboDisplay) finalComboDisplay.textContent = `最大コンボ: ${this.game.maxCombo}`;
    if (rankDisplay) rankDisplay.textContent = `ランク: ${rank}`;
    
    // Reset input and button state
    if (nameInput) nameInput.value = '';
    if (registerScoreBtn) {
      registerScoreBtn.textContent = 'ランキングに登録';
      registerScoreBtn.classList.remove('opacity-50', 'cursor-not-allowed');
      registerScoreBtn.disabled = false;
    }
    this.game.resultReported = false; // Reset reported flag

    resultsScreen.classList.remove('hidden');
    resultsScreen.style.display = 'flex';
    setTimeout(() => {
      resultsScreen.classList.add('show');
      console.log('リザルト画面のshowクラスを追加しました');
    }, 100);

    this.setupResultsButtons();
  }

  setupResultsButtons(): void {
    const backToTitle = document.getElementById('back-to-title');
    const replaySong = document.getElementById('replay-song');
    const registerScore = document.getElementById('register-score');
    const openRanking = document.getElementById('open-ranking');
    const nameInput = document.getElementById('player-name-input') as HTMLInputElement;

    const submitScore = async () => {
      if (this.game.resultReported) return;
      
      const rank = calculateRank(this.game.score);
      // そのまま送る (サーバー側でバリデーションされる)
      const modeForResult = this.game.currentMode;
      const playerName = nameInput?.value.trim() || 'ゲスト';

      // Turnstile 実行
      const turnstileContainer = document.getElementById('turnstile-container');
      const hasTurnstile = Boolean(turnstileContainer && (window as any).turnstile);
      const siteKey = hasTurnstile ? await this.game.getTurnstileSiteKey() : null;
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const resolvedSiteKey = siteKey || (isLocalhost ? '1x00000000000000000000AA' : null);
      if (hasTurnstile) {
          if (!resolvedSiteKey) {
            console.error('[Results] Turnstile site key not configured');
            if (registerScore) {
              (registerScore as HTMLButtonElement).disabled = false;
              registerScore.textContent = '認証設定エラー';
            }
            return;
          }
          if (this.turnstileWidgetId) {
            if (registerScore) {
              (registerScore as HTMLButtonElement).disabled = true;
              registerScore.textContent = '認証中...';
            }
            try { (window as any).turnstile.reset(this.turnstileWidgetId); } catch {}
            return;
          }
          if (registerScore) {
             (registerScore as HTMLButtonElement).disabled = true;
             registerScore.textContent = '認証中...';
          }

          try {
              const widgetId = (window as any).turnstile.render('#turnstile-container', {
                  // テスト用キー (Always Pass): 1x00000000000000000000AA
                  sitekey: resolvedSiteKey,
                  callback: async (token: string) => {
                      if (typeof this.game.onGameEnd === 'function') {
                        try {
                          const result = await this.game.onGameEnd({
                            songId: this.game.songId || 'HmfsoBVch26BmLCm',
                            mode: modeForResult,
                            score: Math.round(this.game.score),
                            maxCombo: this.game.maxCombo,
                            rank,
                            playerName,
                            turnstileToken: token
                          });
                          
                          if ((result as any) === true) {
                            this.game.resultReported = true;
                            if (registerScore) {
                              registerScore.textContent = '登録完了';
                              registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                              (registerScore as HTMLButtonElement).disabled = true;
                            }
                            // ウィジェット削除
                            setTimeout(() => {
                               try {
                                 if (this.turnstileWidgetId) {
                                   (window as any).turnstile.remove(this.turnstileWidgetId);
                                 } else {
                                   (window as any).turnstile.remove('#turnstile-container');
                                 }
                               } catch(e) {}
                               this.turnstileWidgetId = null;
                            }, 1000);
                          } else {
                            if (registerScore) {
                              (registerScore as HTMLButtonElement).disabled = false;
                              registerScore.textContent = '登録失敗 (再試行)';
                            }
                            try {
                              if (this.turnstileWidgetId) {
                                (window as any).turnstile.reset(this.turnstileWidgetId);
                              } else {
                                (window as any).turnstile.reset('#turnstile-container');
                              }
                            } catch(e) {}
                          }
                        } catch (error) {
                          console.error('onGameEnd handler error', error);
                          if (registerScore) {
                              (registerScore as HTMLButtonElement).disabled = false;
                              registerScore.textContent = '登録失敗 (再試行)';
                          }
                        }
                      }
                  },
                  'error-callback': () => {
                      if (registerScore) {
                          (registerScore as HTMLButtonElement).disabled = false;
                          registerScore.textContent = '登録失敗 (再試行)';
                      }
                  }
              });
              this.turnstileWidgetId = typeof widgetId === 'string' ? widgetId : null;
          } catch (e) {
              console.error('Turnstile error:', e);
              this.turnstileWidgetId = null;
              // フォールバック
              if (typeof this.game.onGameEnd === 'function') {
                  (async () => {
                    const result = await this.game.onGameEnd!({
                        songId: this.game.songId || 'HmfsoBVch26BmLCm',
                        mode: modeForResult,
                        score: Math.round(this.game.score),
                        maxCombo: this.game.maxCombo,
                        rank,
                        playerName,
                    });
                    if ((result as any) === true) {
                        this.game.resultReported = true;
                        if (registerScore) {
                            registerScore.textContent = '登録完了';
                            registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                            (registerScore as HTMLButtonElement).disabled = true;
                        }
                    } else {
                        if (registerScore) {
                            (registerScore as HTMLButtonElement).disabled = false;
                            registerScore.textContent = '登録失敗 (再試行)';
                        }
                    }
                  })();
              }
          }
      } else {
          if (typeof this.game.onGameEnd === 'function') {
            (async () => {
                try {
                  const result = await this.game.onGameEnd!({
                    songId: this.game.songId || 'HmfsoBVch26BmLCm', // Fallback ID if undefined
                    mode: modeForResult,
                    score: Math.round(this.game.score),
                    maxCombo: this.game.maxCombo,
                    rank,
                    playerName,
                  });
                  
                  if ((result as any) === true) {
                    this.game.resultReported = true;
                    if (registerScore) {
                        registerScore.textContent = '登録完了';
                        registerScore.classList.add('opacity-50', 'cursor-not-allowed');
                        (registerScore as HTMLButtonElement).disabled = true;
                    }
                  } else {
                    if (registerScore) {
                        (registerScore as HTMLButtonElement).disabled = false;
                        registerScore.textContent = '登録失敗 (再試行)';
                    }
                  }
                } catch (error) {
                  console.error('onGameEnd handler error', error);
                  if (registerScore) {
                      (registerScore as HTMLButtonElement).disabled = false;
                      registerScore.textContent = '登録失敗 (再試行)';
                  }
                }
            })();
          }
      }
    };

    let lastTouchTime = 0;
    const addEvents = (element: HTMLElement | null, handler: () => void) => {
      if (!element) return;
      // Use onclick to prevent duplicate listeners
      element.onclick = (e) => {
        if (Date.now() - lastTouchTime < 600) return;
        handler();
      };
      element.ontouchend = (e) => {
        e.preventDefault();
        lastTouchTime = Date.now();
        handler();
      };
    };

    addEvents(registerScore, () => {
      void submitScore();
    });

    addEvents(openRanking, () => {
      void submitScore();
    });

    addEvents(backToTitle, () => {
      if (!this.game.resultReported) {
        // カスタムモーダルを表示するためにイベントを発火
        const event = new CustomEvent('show-confirm-modal', { 
          detail: { 
            type: 'title',
            message: 'ランキングに登録されていません。\nスコアは破棄されますが、タイトルに戻りますか？' 
          } 
        });
        window.dispatchEvent(event);
        return;
      }
      // React側で遷移処理を行う（beforeunload対策）
      window.dispatchEvent(new CustomEvent('game-navigate', { detail: { url: '/' } }));
    });

    addEvents(replaySong, () => {
      if (!this.game.resultReported) {
        // カスタムモーダルを表示するためにイベントを発火
        const event = new CustomEvent('show-confirm-modal', { 
          detail: { 
            type: 'retry',
            message: 'ランキングに登録されていません。\nスコアは破棄されますが、リトライしますか？' 
          } 
        });
        window.dispatchEvent(event);
        return;
      }
      // React側でリロード処理を行う（beforeunload対策）
      window.dispatchEvent(new CustomEvent('game-reload'));
    });
  }
}

// SRP: UI表示・テキスト更新・インジケーターの責務
class UIManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  updateInstructions(): void {
    const instructionsEl = document.getElementById('instructions');
    if (!instructionsEl) return;

    let text = '';
    const mobileModeActive = this.game.isMobile || this.game.currentMode === 'mobile';
    if (mobileModeActive) {
      text = '歌詞フレーズを長押ししてゲージを満タンにしよう！';
    } else {
      switch (this.game.currentMode) {
        case 'cursor':
          text = '歌詞フレーズを長押しして円形ゲージを100%にしよう！';
          break;
        case 'hand':
          text = 'カメラに手を映してフレーズの上でホールドしよう！';
          break;
        case 'body':
          text = 'カメラに全身を映してフレーズをホールドしよう！';
          break;
        case 'mobile':
          text = '歌詞フレーズを長押ししてゲージを満タンにしよう！';
          break;
        case 'face':
          text = '口の位置を合わせて、口を大きく開けて歌詞バブルをキャッチしよう！';
          break;
      }
    }
    instructionsEl.textContent = text;
  }

  updateHandDetectionIndicator(multiHandLandmarks: Array<Landmark[]> | undefined): void {
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
      this.game.gamecontainer.appendChild(indicator);
    }

    if (multiHandLandmarks && multiHandLandmarks.length > 0) {
      const handCount = multiHandLandmarks.length;
      indicator.textContent = `✋ ${handCount}つの手を検出中 - 準備OK！`;
      indicator.style.backgroundColor = 'rgba(57, 197, 187, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '1';
    } else {
      const tips = [
        '💡 手のひらをカメラに向けてください',
        '💡 明るい場所で手をかざしてください',
        '💡 カメラから30-60cm離れてください',
        '💡 背景とのコントラストを意識してください'
      ];
      const randomTip = tips[Math.floor(Date.now() / 3000) % tips.length];
      indicator.textContent = randomTip;
      indicator.style.backgroundColor = 'rgba(255, 107, 107, 0.9)';
      indicator.style.color = 'white';
      indicator.style.opacity = '0.95';
    }

    if (this.game.currentMode !== 'hand' || this.game.isMobile) {
      indicator.style.display = 'none';
    } else {
      indicator.style.display = 'block';
    }
  }
}

// SRP: 演出（クリック/ヒット）生成の責務
class EffectsManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  createClickEffect(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const burstCount = this.game.isMobile ? 3 : 6;
    const lifespan = this.game.isMobile ? 600 : 800;
    for (let i = 0; i < burstCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = 10 + Math.random() * 15;
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${x - size/2 + (Math.random() - 0.5) * 30}px`;
      particle.style.top = `${y - size/2 + (Math.random() - 0.5) * 30}px`;
      this.game.gamecontainer.appendChild(particle);
      setTimeout(() => particle.remove(), lifespan);
    }

    const pointDisplay = document.createElement('div');
    pointDisplay.className = 'score-popup';
    pointDisplay.textContent = `+${Math.round(this.game.scorePerHit)}`;
    pointDisplay.style.left = `${x}px`;
    pointDisplay.style.top = `${y}px`;
    pointDisplay.style.opacity = '1';
    pointDisplay.style.pointerEvents = 'none';
    this.game.gamecontainer.appendChild(pointDisplay);

    const start = performance.now();
    const duration = this.game.isMobile ? 900 : 1200;
    const drift = this.game.isMobile ? 20 : 28;
    const animate = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      pointDisplay.style.top = `${y - drift * progress}px`;
      pointDisplay.style.opacity = String(1 - progress);
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        pointDisplay.remove();
      }
    };
    requestAnimationFrame(animate);
    setTimeout(() => pointDisplay.remove(), duration + 500);
  }

  createHitEffect(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'tap-ripple';
    ripple.style.left = `${x - 20}px`;
    ripple.style.top = `${y - 20}px`;
    this.game.gamecontainer.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  }
}

// SRP: 入力/イベント配線の責務
class InputManager {
  private game: GameManager

  constructor(game: GameManager) {
    this.game = game;
  }

  setupEvents(): void {
    const gm = this.game;
    let lastTime = 0, lastX = 0, lastY = 0;
    let touched = false;

    // デバッグ用コマンド入力
    let keyBuffer = '';
    const secretCommands: Record<string, () => void> = {
      hhrg: () => {
        console.log('Debug command detected: Force Results');
        gm.showResults();
      },
      knnk: () => gm.suppressBodyWarningsForSong()
    };
    const maxCommandLength = Math.max(...Object.keys(secretCommands).map(code => code.length));
    document.addEventListener('keydown', (e) => {
      keyBuffer += e.key.toLowerCase();
      if (keyBuffer.length > maxCommandLength) {
        keyBuffer = keyBuffer.slice(-maxCommandLength);
      }
      for (const [code, action] of Object.entries(secretCommands)) {
        if (keyBuffer.endsWith(code)) {
          action();
          keyBuffer = '';
          break;
        }
      }
    });

    const handleMove = (x: number, y: number, isTouch: boolean) => {
      const now = Date.now();
      if (now - lastTime < 16) return;
      lastTime = now;
      const dx = x - lastX, dy = y - lastY;
      if (Math.sqrt(dx*dx + dy*dy) >= 3) {
        lastX = x; lastY = y;
        gm.lastMousePos = { x, y };
        const isPointerMode = gm.currentMode === 'cursor' || gm.currentMode === 'mobile';
        if (!isPointerMode) {
          gm.checkLyrics(x, y, isTouch ? 45 : 35);
        }
      }
    };

    gm.gamecontainer.addEventListener('mousemove', e => {
      if (!touched) handleMove(e.clientX, e.clientY, false);
    });

    gm.gamecontainer.addEventListener('touchstart', e => {
      touched = true;
      if (e.touches && e.touches[0] && (gm.currentMode === 'cursor' || gm.currentMode === 'mobile')) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
      }
    }, { passive: true });

    gm.gamecontainer.addEventListener('touchmove', e => {
      if (!gm.isFirstInteraction && e.touches && e.touches[0]) {
        e.preventDefault();
        handleMove(e.touches[0].clientX, e.touches[0].clientY, true);
      }
    }, { passive: false });

    gm.gamecontainer.addEventListener('touchend', () => {
      setTimeout(() => { touched = false; }, 300);
    }, { passive: true });

    const stopPointerHold = () => gm.stopActivePointerHold();
    document.addEventListener('mouseup', stopPointerHold);
    document.addEventListener('touchend', stopPointerHold);
    document.addEventListener('touchcancel', stopPointerHold);

    const handleButtonClick = (event: Event | null) => {
      if (event) event.preventDefault();
      if (!gm.apiLoaded) return;
      if (gm.isFirstInteraction) {
        if (gm.currentMode === 'body') {
          gm.isFirstInteraction = false;
          // アイドルタイマー解除
          gm.timers.clearTimer(TIMER_KEYS.IdleTimeout);
          if (gm.isBodyWarningEnabled()) {
            gm.countdownOverlay.classList.remove('hidden');
            gm.countdownText.textContent = '全身が映るように調整してください';
          } else {
            gm.countdownOverlay.classList.add('hidden');
          }
          return;
        }
      // アイドルタイマー解除
      gm.timers.clearTimer(TIMER_KEYS.IdleTimeout);
        gm.playMusic();
        return;
      }
      gm.togglePlay();
    };

    gm.playpause.addEventListener('click', handleButtonClick);
    gm.playpause.addEventListener('touchend', handleButtonClick, { passive: false });

    const handleRestartClick = (event: Event | null) => {
      if (event) event.preventDefault();
      if (!gm.apiLoaded) return;
      gm.restartGame();
    };

    gm.restart.addEventListener('click', handleRestartClick);
    gm.restart.addEventListener('touchend', handleRestartClick, { passive: false });

    document.addEventListener('dblclick', (event) => {
      const firesTouchEvents =
        'sourceCapabilities' in event &&
        (event as { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities
          ?.firesTouchEvents;
      if (gm.isMobile || firesTouchEvents) return;
      if (!gm.isFirstInteraction && !gm.resultsDisplayed) {
        console.log('ダブルクリックによる結果表示');
        gm.showResults();
      }
    });
  }
}

// SRP: ビューポート・デバイス関連の責務
class ViewportManager {
  updateViewportHeight(): void {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
}

export { GameManager }
export default GameManager

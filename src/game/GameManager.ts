import * as THREE from 'three'
import { Player } from 'textalive-app-api'
import { GameLoop } from './GameLoop'
import { BubblePool } from './BubblePool'
import { TimerManager } from './TimerManager'
import { TIMER_KEYS } from './constants'
import { LiveStageVisuals } from './managers/LiveStageVisuals'
import { FaceDetectionManager } from './managers/FaceDetectionManager'
import { BodyDetectionManager } from './managers/BodyDetectionManager'
import { LyricsRenderer } from './managers/LyricsRenderer'
import { ResultsManager } from './managers/ResultsManager'
import { UIManager } from './managers/UIManager'
import { EffectsManager } from './managers/EffectsManager'
import { InputManager } from './managers/InputManager'
import { ViewportManager } from './managers/ViewportManager'
import type {
  PlayMode,
  GameConfig,
  GameResult,
  LyricData,
  MousePosition,
  ExtendedPlayer,
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
  public speed: number
  
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
  private hands: { send(options: { image: HTMLVideoElement }): Promise<void>; close(): Promise<void> } | null
  // 以下は将来のhand mode実装用に保持
  private _handHistory: Array<{ x: number; y: number }>
  private _lastWaveTime: number
  private _waveThreshold: number
  private _waveTimeWindow: number
  
  // カメラ制御
  private camera: { start(): Promise<void>; stop(): void } | any | null = null; // MediaPipe Camera instance

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

    // 速度コース設定（8/10/12秒、デフォルト10秒）
    const rawSpeed = config.speed ?? 10;
    this.speed = [8, 10, 12].includes(rawSpeed) ? rawSpeed : 10;
    document.documentElement.style.setProperty('--lyric-speed', `${this.speed}s`);

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

  private isCameraMode(): boolean {
    return this.currentMode === 'body' || this.currentMode === 'face' || this.currentMode === 'hand';
  }

  private hasActiveCameraStream(): boolean {
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement | null;
    const stream = videoElement?.srcObject as MediaStream | null;
    if (!stream) return false;
    return stream.getTracks().some(track => track.readyState === 'live');
  }

  async ensureCameraReady(): Promise<boolean> {
    if (!this.isCameraMode()) return true;
    if (this.camera && this.hasActiveCameraStream()) return true;
    return this.initCamera();
  }

  async initCamera(): Promise<boolean> {
    // モバイルデバイスの場合はカメラ機能を無効化 (ただしfaceモードを除く)
    if (this.isMobile && this.currentMode !== 'face') {
      console.log('モバイルデバイスが検出されました。カメラ機能は無効化されます。');
      return true;
    }
    
    // 既存のカメラインスタンスがあれば停止 (ループ処理の停止)
    if (this.camera) {
        try {
            // @ts-ignore - Check if stop exists (depends on version)
            if (typeof this.camera.stop === 'function') {
                // @ts-ignore
                this.camera.stop(); 
            }
        } catch(e) { console.debug("Camera stop error", e); }
        this.camera = null;
    }
    
    // 既存のvideoElementがある場合、残留ストリームを確実に停止し、要素も削除する
    // これにより、毎回必ず新しい権限リクエスト/ストリーム取得が行われるようにする
    let videoElement = document.getElementById('camera-video') as HTMLVideoElement | null;
    
    if (videoElement) {
         if (videoElement.srcObject) {
             try {
                 const stream = videoElement.srcObject as MediaStream;
                 stream.getTracks().forEach(track => track.stop());
             } catch (e) {
                 console.error("Error stopping existing video stream:", e);
             }
         }
         videoElement.remove();
         videoElement = null;
    }

    if (!videoElement) {
        videoElement = document.createElement('video');
        videoElement.id = 'camera-video';
        videoElement.classList.add('hidden'); // デフォルトで非表示
        document.body.appendChild(videoElement);
    }
    const segmentationCanvas = document.getElementById('segmentation-canvas') as HTMLCanvasElement | null;
    if (!segmentationCanvas) return false;
    const segmentationCtx = segmentationCanvas.getContext('2d');
    if (!segmentationCtx) return false;

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
        return true; // カメラが不要なモードではここで処理を終了
    }

    // 既存のカメラインスタンスがあれば停止
    // (既に冒頭で停止しているはずだが、念のためnullチェック済み)


    let canvasInitialized = false;
    const processInterval = 33; // ~30FPS
    let lastProcessTime = 0;

    const selfieSegmentation = new SelfieSegmentation({ locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}` });
    selfieSegmentation.setOptions({ modelSelection: 1, selfieMode: false });
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
            modelComplexity: 2,
            smoothLandmarks: true,
            enableSegmentation: false,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
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

    // Cameraクラス（MediaPipe utility）を使用せず、直接getUserMediaを使用して
    // ライブラリ由来の"Failed to acquire camera feed"エラーを回避する
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        
        videoElement.srcObject = stream;
        
        // ビデオの再生開始を待つ
        await new Promise<void>((resolve) => {
            videoElement.onloadedmetadata = () => {
                videoElement.play().then(() => resolve());
            };
        });

        // 処理ループの開始
        let requestAnimId: number;
        const tick = async () => {
            if (videoElement.paused || videoElement.ended) return;

            if (!canvasInitialized && videoElement.videoWidth > 0) {
                segmentationCanvas.width = videoElement.videoWidth;
                segmentationCanvas.height = videoElement.videoHeight;
                canvasInitialized = true;
            }

            const now = performance.now();
            if (now - lastProcessTime >= processInterval) {
                lastProcessTime = now;
                const frame = { image: videoElement };
                
                // フレーム処理
                if (selfieSegmentation) await selfieSegmentation.send(frame);
                if (this.pose) await this.pose.send(frame);
                if (this.hands) await this.hands.send(frame);
                if (this.faceDetection) await this.faceDetection.send(frame);
            }
            
            requestAnimId = requestAnimationFrame(tick);
        };
        tick();

        // クリーンアップ用オブジェクトを設定
        this.camera = {
            stop: () => {
                if (requestAnimId) cancelAnimationFrame(requestAnimId);
                if (stream) stream.getTracks().forEach(track => track.stop());
            }
        };
        return true;
        
    } catch(e) {
        alert("カメラの使用が許可されませんでした。\nタイトルに戻ります。");
        window.location.href = '/'; 
        return false;
    }
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
        // Songle APIタイマーが機能しない環境（学校ネットワーク等）では
        // audio要素のcurrentTimeをフォールバックとして使用
        if (pos <= 0 && !this.isPaused && this.player.mediaElement) {
          const audioPos = (this.player.mediaElement as HTMLAudioElement).currentTime * 1000;
          if (audioPos > 0) {
            this.playbackPosition = audioPos;
            return audioPos;
          }
        }
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
        if (this.restart) {
          this.restart.disabled = false;
          this.restart.classList.remove('opacity-50', 'cursor-not-allowed');
        }
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
        if (this.restart) {
          this.restart.disabled = true;
          this.restart.classList.add('opacity-50', 'cursor-not-allowed');
        }
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

    // カメラを使用するモードでは、カメラ許可を再度確認するために再初期化する
    if (this.currentMode === 'face' || this.currentMode === 'body' || this.currentMode === 'hand') {
      await this.initCamera();
    }
    
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
    
    // ボディモード以外もリスタート時はFirstInteractionに戻して再開処理を通す
    // これにより次回再生時に必ずinitCamera(許可確認)が呼ばれるようになる
    this.isFirstInteraction = true;
    console.log("リスタート: FirstInteractionフラグをリセット");
    
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
              // 準備完了時もリスタートボタンは無効のまま（再生開始まで待機、または一時停止時に有効化する方針ならここは無効でよい）
              // 要望: 「一時停止ボタンが押されるまでずっと押せないように」
              // → 初期状態は無効
              this.restart.disabled = true;
              this.restart.classList.add('opacity-50', 'cursor-not-allowed');
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
          if (this.restart) {
            this.restart.disabled = true;
            this.restart.classList.add('opacity-50', 'cursor-not-allowed');
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
          // 終了間際（残り1.5秒未満）なら、リザルト遷移待ちなので「再生」に戻さない
          const duration = this.player?.video?.duration;
          const isNearEnd = duration && this.lastPlayerPosition && (duration - this.lastPlayerPosition < 1500);

          if (!isNearEnd) {
            if (this.playpause) {
              const span = this.playpause.querySelector('span');
              if (span) span.textContent = '再生';
              else this.playpause.textContent = '再生';
            }
            if (this.restart) {
              this.restart.disabled = false;
              this.restart.classList.remove('opacity-50', 'cursor-not-allowed');
            }
          }
          // 観客のランダムテキスト機能は削除
        },
        // 停止時（自動リスタートを廃止し、終了間際ならリザルトを表示）
        onStop: () => {
          this.isPaused = true;
          const duration = this.player?.video?.duration;
          const isNearEnd = !this.resultsDisplayed && duration && this.lastPlayerPosition && (duration - this.lastPlayerPosition < 1500);

          if (isNearEnd) {
            console.log('onStop 終了直前停止を検出 → リザルト表示');
            this.showResults();
            // ボタンは「一時停止」のまま維持する
          } else {
            console.log('onStop 通常停止（再生ボタン待機）');
            if (this.playpause) {
              const span = this.playpause.querySelector('span');
              if (span) span.textContent = '再生';
              else this.playpause.textContent = '再生';
            }
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
      if (this.restart) {true;
        this.restart.classList.add('opacity-50', 'cursor-not-allowed')
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
      
      // 警告表示中（全身未検出など）はホールド判定を行わない
      if (!this.countdownOverlay.classList.contains('hidden')) {
          // すべてのホールドを解除
        for (const el of this.currentBodyHolds) {
          this.stopBubbleHold(el, 'auto');
        }
        this.currentBodyHolds.clear();
        return;
      }
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
    if (this.combo % 10 === 0) {
      this.triggerComboEffect();
    }
    
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

  triggerComboEffect(): void {
    // SRP: EffectsManagerに委譲
    return this.effects.triggerComboEffect(this.combo);
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
    // MediaPipeとカメラリソースのクリーンアップ
    if (this.camera) {
        try {
            // @ts-ignore
            if (typeof this.camera.stop === 'function') this.camera.stop(); 
        } catch {}
        this.camera = null;
    }

    if (this.pose) {
        this.pose.close();
        this.pose = null;
    }
    if (this.hands) {
        this.hands.close();
        this.hands = null;
    }
    if (this.faceDetection) {
        this.faceDetection.close();
    }
    
    // カメラのストリーム停止と要素削除
    const videoElement = document.getElementById('camera-video') as HTMLVideoElement;
    if (videoElement) {
        if (videoElement.srcObject) {
            const stream = videoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
        videoElement.remove();
    }
    
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

export { GameManager }
export default GameManager

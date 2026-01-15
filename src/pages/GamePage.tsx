import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Helmet } from "react-helmet-async"
import { useNavigate } from "react-router-dom"
import GameManager from "../game/GameManager"
import { initLiveParticles, loadSongConfig } from "../game/gameLoader"
import RankingModal from "../components/game/RankingModal"
import { clearRankingCache } from "../components/game/RankingPanel"
import { type GameResult, type PlayMode } from "../types/game"
import "../styles.css"

const SONG_ID = "HmfsoBVch26BmLCm"

// 終了確認モーダル
const ConfirmModal = ({ open, onClose, onConfirm, message }: { open: boolean; onClose: () => void; onConfirm: () => void; message?: string }) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-8 max-w-md w-full shadow-[0_0_30px_rgba(57,197,187,0.2)]">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <span className="w-1 h-8 bg-miku block"></span>
          確認
        </h3>
        <p className="text-gray-300 mb-8 leading-relaxed whitespace-pre-wrap">
          {message || <>ゲームを終了してタイトル画面に戻りますか？<br/><span className="text-sm text-gray-500">※プレイ中のスコアは保存されません</span></>}
        </p>
        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            続ける
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 rounded-lg bg-miku/20 border border-miku/50 text-miku hover:bg-miku/30 hover:shadow-[0_0_15px_rgba(57,197,187,0.4)] transition-all font-bold"
          >
            終了する
          </button>
        </div>
      </div>
    </div>
  )
}

function GamePage() {
  const normalizeMode = (mode: string | null | undefined): PlayMode | null =>
    mode === 'cursor' || mode === 'body' || mode === 'mobile' || mode === 'hand' || mode === 'face' ? mode : null
  const getInitialMode = useCallback((): PlayMode => {
    if (typeof window === 'undefined') return 'cursor'
    const params = new URLSearchParams(window.location.search)
    const urlMode = normalizeMode(params.get('mode'))
    const storedMode = normalizeMode(localStorage.getItem('gameMode'))
    const prefersTouch =
      window.matchMedia('(max-width: 820px)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0

    if (prefersTouch && (urlMode === 'body' || urlMode === 'hand')) return 'mobile'
    if (!prefersTouch && urlMode === 'mobile') return 'cursor'
    if (urlMode) return urlMode
    
    // モバイル端末なら、localStorageに関わらずmobileモードをデフォルトにする（ただしfaceモードは許可）
    if (prefersTouch && storedMode !== 'face') return 'mobile'

    if (!prefersTouch && storedMode === 'mobile') return 'cursor'
    if (storedMode) return storedMode
    return 'cursor'
  }, [])


  const navigate = useNavigate()
  const { songData, accentColor } = useMemo(() => loadSongConfig(), [])
  const [rankingMode, setRankingMode] = useState<PlayMode>(getInitialMode)
  const [showRanking, setShowRanking] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [confirmMessage, setConfirmMessage] = useState<string | undefined>(undefined)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const lastSubmittedKeyRef = useRef<string | null>(null)
  const scoreTokenRef = useRef<string | null>(null)
  const managerRef = useRef<GameManager | null>(null)
  const redirectOnReloadRef = useRef(false)
  const isNavigatingRef = useRef(false)
  const prefersTouch = useMemo(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(max-width: 820px)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    )
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const navType = navEntry?.type
    let reloadFlag: string | null = null
    try {
      reloadFlag = sessionStorage.getItem('returnToTitle')
    } catch {}
    const shouldRedirect =
      navType === 'reload' ||
      navType === 'back_forward' ||
      reloadFlag === '1'

    if (shouldRedirect) {
      try {
        sessionStorage.removeItem('returnToTitle')
      } catch {}
      redirectOnReloadRef.current = true
      navigate('/', { replace: true })
    }
  }, [navigate])


  // デバッグ用キー入力監視
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // windowオブジェクトに履歴を保存して永続化
      const history = (window as any)._debugKeyHistory || "";
      const newHistory = (history + key).slice(-4);
      (window as any)._debugKeyHistory = newHistory;

      if (newHistory === "hhrg") {
        console.log("Debug command detected: hhrg");
        managerRef.current?.forceEndGame();
        (window as any)._debugKeyHistory = ""; // Reset
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch score signing token
  useEffect(() => {
    const fetchToken = () => {
      fetch('/api/token')
        .then(res => res.json())
        .then(data => {
          if (data.data?.token) {
            scoreTokenRef.current = data.data.token
          }
        })
        .catch(err => console.error('Failed to fetch token:', err))
    }

    fetchToken()
    // Refresh token every 4 minutes to prevent expiration
    const interval = setInterval(fetchToken, 4 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const submitScore = useCallback(async (gameResult: GameResult): Promise<boolean> => {
    const key = `${gameResult.songId}-${gameResult.mode}-${gameResult.score}-${gameResult.maxCombo}-${gameResult.rank}`
    if (lastSubmittedKeyRef.current === key) return true
    lastSubmittedKeyRef.current = key

    setIsSubmitting(true)
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (scoreTokenRef.current) {
        headers["x-score-token"] = scoreTokenRef.current
      }

      const res = await fetch("/api/score", {
        method: "POST",
        headers,
        body: JSON.stringify(gameResult),
      })
      
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        console.error("Score submit failed", payload?.error?.message ?? res.statusText)
        return false
      } else {
        // スコア送信成功時にランキングキャッシュをクリア
        clearRankingCache()
        return true
      }
    } catch (error) {
      console.error("Score submit error", error)
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const handleGameEnd = useCallback(
    async (gameResult: GameResult) => {
      setRankingMode(gameResult.mode)
      return await submitScore(gameResult)
    },
    [submitScore]
  )

  const handleCloseRanking = useCallback(() => setShowRanking(false), [])
  const handleOpenRanking = useCallback(() => setShowRanking(true), [])

  const handleExitConfirm = useCallback(() => {
    isNavigatingRef.current = true
    if (confirmAction) {
      confirmAction()
    } else {
      navigate('/')
    }
  }, [confirmAction, navigate])

  useEffect(() => {
    // ブラウザバック対策
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      
      // リザルト画面で、すでにスコア送信済みの場合は確認なしで戻る
      if (managerRef.current?.resultsDisplayed && managerRef.current?.resultReported) {
        isNavigatingRef.current = true;
        navigate('/');
        return;
      }
      
      let message = undefined;
      if (managerRef.current?.resultsDisplayed && !managerRef.current?.resultReported) {
         message = 'ランキングに登録されていません。\nスコアは破棄されますが、タイトルに戻りますか？';
      }

      setConfirmMessage(message)
      setConfirmAction(null)
      setShowExitConfirm(true)
    }

    // カスタム確認モーダルイベント
    const handleShowConfirm = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setConfirmMessage(detail.message);
      
      if (detail.type === 'retry') {
        setConfirmAction(() => () => setRetryCount(c => c + 1));
      } else {
        setConfirmAction(() => () => navigate('/'));
      }
      
      setShowExitConfirm(true);
    };

    // 意図的な遷移イベント
    const handleGameNavigate = (e: Event) => {
      isNavigatingRef.current = true;
      navigate((e as CustomEvent).detail.url);
    };

    // 意図的なリロードイベント
    const handleGameReload = () => {
      isNavigatingRef.current = true;
      setRetryCount(c => c + 1);
    };

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('show-confirm-modal', handleShowConfirm)
    window.addEventListener('game-navigate', handleGameNavigate)
    window.addEventListener('game-reload', handleGameReload)

    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('show-confirm-modal', handleShowConfirm)
      window.removeEventListener('game-navigate', handleGameNavigate)
      window.removeEventListener('game-reload', handleGameReload)
    }
  }, [])

  useEffect(() => {
    if (redirectOnReloadRef.current) return
    const bodyClass = "game-body"
    document.body.classList.add(bodyClass)
    document.documentElement.style.setProperty("--bg-accent-color", accentColor)

    const titleEl = document.getElementById("song-title")
    if (titleEl) titleEl.textContent = songData.title
    const loadingEl = document.getElementById("loading")
    if (loadingEl) loadingEl.textContent = `${songData.title} ロード中...`

    initLiveParticles(document.getElementById("game-particles"))

    const initialMode: PlayMode = getInitialMode()

    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem('returnToTitle', '1')
      } catch {}
      managerRef.current?.cleanup?.()
    }

    const timer = setTimeout(() => {
      managerRef.current = new GameManager({
        songId: SONG_ID,
        mode: initialMode,
        onGameEnd: handleGameEnd,
      })
      ;(window as unknown as { gameManager: GameManager }).gameManager = managerRef.current
      window.addEventListener("beforeunload", handleBeforeUnload)
    }, 100)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      try {
        managerRef.current?.cleanup?.()
      } catch (error) {
        console.error("Game cleanup error", error)
      }
      managerRef.current = null
      delete (window as unknown as { gameManager?: GameManager }).gameManager
      document.body.classList.remove(bodyClass)
      lastSubmittedKeyRef.current = null
    }
  }, [accentColor, getInitialMode, handleGameEnd, songData.title, retryCount])

  return (
    <>
      <Helmet>
        <title>Cross Stage</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
      </Helmet>
      <div className="relative w-full h-screen overflow-hidden" id="game-root">
        <video id="camera-video" className="hidden" />
        <canvas id="segmentation-canvas" className="fixed top-0 left-0 w-full h-full z-[1]" />

        <div
          id="countdown-overlay"
          className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-70 z-[1000] hidden"
        >
          <span id="countdown-text" className="text-white text-9xl font-bold"></span>
        </div>

        <div id="live-background" className="fixed top-0 left-0 w-full h-full z-0 bg-black">
          {/* Simplified Dark Stage Background */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1a1a2e_0%,_#000000_100%)] opacity-80"></div>
          
          {/* Subtle Grid Floor */}
          <div 
            className="absolute bottom-0 left-0 w-full h-1/2 opacity-20"
            style={{
              background: 'linear-gradient(transparent 0%, #39C5BB 100%)',
              maskImage: 'linear-gradient(to bottom, transparent, black)',
              WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
              transform: 'perspective(500px) rotateX(60deg) translateY(100px)'
            }}
          >
            <div className="w-full h-full" style={{
              backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(57, 197, 187, .3) 25%, rgba(57, 197, 187, .3) 26%, transparent 27%, transparent 74%, rgba(57, 197, 187, .3) 75%, rgba(57, 197, 187, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(57, 197, 187, .3) 25%, rgba(57, 197, 187, .3) 26%, transparent 27%, transparent 74%, rgba(57, 197, 187, .3) 75%, rgba(57, 197, 187, .3) 76%, transparent 77%, transparent)',
              backgroundSize: '50px 50px'
            }}></div>
          </div>

          {/* Ambient Spotlights (Subtle) */}
          <div className="absolute top-[-20%] left-1/4 w-[50%] h-[80%] bg-cyan-900/20 blur-[100px] rounded-full mix-blend-screen animate-pulse"></div>
          <div className="absolute top-[-20%] right-1/4 w-[50%] h-[80%] bg-purple-900/20 blur-[100px] rounded-full mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }}></div>

          {/* Audience Area */}
          <div
            id="audience-area"
            className="absolute bottom-0 left-0 w-full h-1/3 pointer-events-none"
            style={{ zIndex: 5 }}
          >
             <div className="absolute inset-0 bg-gradient-to-t from-black via-black/90 to-transparent"></div>
             <div
              className="absolute bottom-0 left-0 w-full h-full opacity-60"
              style={{
                backgroundImage: "repeating-linear-gradient(90deg, transparent 0px, transparent 10px, #050505 10px, #050505 25px)",
                animation: "audienceWave 4s ease-in-out infinite",
                transformOrigin: "bottom"
              }}
            ></div>
          </div>

          <div id="game-particles" className="absolute top-0 left-0 w-full h-full pointer-events-none"></div>
        </div>

        <div id="game-container">
          <div id="miku"></div>
          <div id="song-info">
            <div id="song-title">{songData.title}</div>
            <div id="song-artist">{songData.artist}</div>
            <div id="loading">{`${songData.title} ロード中...`}</div>
          </div>

          <div id="score-container">
            <div id="score">0</div>
            <div id="combo">コンボ: 0</div>
          </div>

          <div id="instructions">歌詞フレーズを長押ししてゲージを満たそう！</div>
          <div id="controls" className="absolute bottom-[calc(20px+env(safe-area-inset-bottom))] right-5 z-[1100] flex gap-3">
            <button 
              id="play-pause" 
              aria-label="再生/一時停止"
              disabled
              className="group relative flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-miku/20 border border-white/20 hover:border-miku/50 rounded-lg backdrop-blur-sm transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/40 disabled:hover:border-white/20 text-white"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-miku/0 via-miku/10 to-miku/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-miku group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold text-white group-hover:text-white tracking-wider drop-shadow-md">再生</span>
            </button>

            <button 
              id="restart" 
              aria-label="最初から"
              disabled
              className="group relative flex items-center gap-2 px-5 py-2.5 bg-black/40 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-sm transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black/40 disabled:hover:border-white/20"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-bold text-gray-200 group-hover:text-white tracking-wider">最初から</span>
            </button>
          </div>

        </div>

        <div id="results-screen" className="hidden">
          <div className="results-container">
            <h2>リザルト</h2>
            <div className="results-content">
              <div className="results-score-section">
                <div id="final-score-display">0</div>
                <div id="final-combo-display">最大コンボ 0</div>
                <div id="rank-display">ランク: S</div>
              </div>
              
              <div className="flex flex-col items-center gap-2 mt-6 w-full max-w-xs mx-auto z-50 relative">
                <input 
                  id="player-name-input" 
                  type="text" 
                  placeholder="名前を入力 (省略可)" 
                  maxLength={20}
                  className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-miku text-center"
                  onKeyDown={(e) => e.stopPropagation()}
                />
                <button 
                  id="register-score"
                  className="w-full px-4 py-2 bg-miku/20 hover:bg-miku/40 border border-miku/50 rounded text-miku font-bold transition-colors"
                >
                  ランキングに登録
                </button>
                <div id="turnstile-container" className="mt-2"></div>
              </div>
            </div>
            <div className="results-buttons flex flex-wrap justify-center gap-4 mt-8 w-full">
              <button 
                id="back-to-title"
                className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-black/40 hover:bg-white/10 border border-white/20 hover:border-white/40 rounded-lg backdrop-blur-sm transition-all duration-300 overflow-hidden text-white font-bold tracking-wider min-w-[160px]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                タイトルへ戻る
              </button>
              <button 
                id="replay-song"
                className="group relative flex items-center justify-center gap-2 px-6 py-3 bg-miku/20 hover:bg-miku/40 border border-miku/50 hover:border-miku rounded-lg backdrop-blur-sm transition-all duration-300 overflow-hidden text-white font-bold tracking-wider min-w-[160px]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-miku/0 via-miku/20 to-miku/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-miku group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                もう一度プレイ
              </button>
            </div>
          </div>
        </div>

        <RankingModal
          open={showRanking}
          onClose={handleCloseRanking}
          songId={SONG_ID}
          mode={rankingMode}
          onModeChange={setRankingMode}
        />

        <ConfirmModal
          open={showExitConfirm}
          onClose={() => setShowExitConfirm(false)}
          onConfirm={handleExitConfirm}
          message={confirmMessage}
        />
      </div>
    </>
  )
}

export default GamePage

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Helmet } from "react-helmet-async"
import GameManager from "../game/GameManager"
import { initLiveParticles, loadSongConfig } from "../game/gameLoader"
import { Slot } from "../components/game/Slot"
import ModeTabs from "../components/game/ModeTabs"
import RankingPanel from "../components/game/RankingPanel"
import { type GameResult, type PlayMode } from "../types/game"
import "../styles.css"

const SONG_ID = "HmfsoBVch26BmLCm"

function GamePage() {
  const { songData, accentColor } = useMemo(() => loadSongConfig(), [])
  const [result, setResult] = useState<GameResult | null>(null)
  const [rankingMode, setRankingMode] = useState<PlayMode>("cursor")
  const [showRanking, setShowRanking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const lastSubmittedKeyRef = useRef<string | null>(null)

  const submitScore = useCallback(async (gameResult: GameResult) => {
    const key = `${gameResult.songId}-${gameResult.mode}-${gameResult.score}-${gameResult.maxCombo}-${gameResult.rank}`
    if (lastSubmittedKeyRef.current === key) return
    lastSubmittedKeyRef.current = key

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(gameResult),
      })
      const payload = await res.json().catch(() => null)
      if (!res.ok || (payload && payload.ok === false)) {
        console.error("Score submit failed", payload?.error ?? res.statusText)
      }
    } catch (error) {
      console.error("Score submit error", error)
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const handleGameEnd = useCallback(
    (gameResult: GameResult) => {
      setResult(gameResult)
      setRankingMode(gameResult.mode)
      submitScore(gameResult)
    },
    [submitScore]
  )

  useEffect(() => {
    const bodyClass = "game-body"
    document.body.classList.add(bodyClass)
    document.documentElement.style.setProperty("--bg-accent-color", accentColor)

    const titleEl = document.getElementById("song-title")
    if (titleEl) titleEl.textContent = songData.title
    const loadingEl = document.getElementById("loading")
    if (loadingEl) loadingEl.textContent = `${songData.title} ロード中...`

    initLiveParticles(document.getElementById("game-particles"))

    const params = new URLSearchParams(window.location.search)
    const initialMode: PlayMode = params.get("mode") === "body" ? "body" : "cursor"

    let manager: GameManager | null = null
    const handleBeforeUnload = () => manager?.cleanup?.()

    const timer = setTimeout(() => {
      manager = new GameManager({
        songId: SONG_ID,
        mode: initialMode,
        onGameEnd: handleGameEnd,
      })
      window.gameManager = manager
      window.addEventListener("beforeunload", handleBeforeUnload)
    }, 100)

    return () => {
      clearTimeout(timer)
      window.removeEventListener("beforeunload", handleBeforeUnload)
      try {
        manager?.cleanup?.()
      } catch (error) {
        console.error("Game cleanup error", error)
      }
      if (window.gameManager) {
        delete window.gameManager
      }
      document.body.classList.remove(bodyClass)
      lastSubmittedKeyRef.current = null
    }
  }, [accentColor, handleGameEnd, songData.title])

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

        {/* Slots for bubbles */}
        <Slot id="slot-top" position="top" />
        <Slot id="slot-bottom" position="bottom" />
        <Slot id="slot-left" position="left" />
        <Slot id="slot-right" position="right" />

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

          <div id="instructions">歌詞にマウスを当ててポイントを獲得しよう！</div>
          <div id="controls">
            <button id="play-pause" aria-label="再生/一時停止">再生</button>
            <button id="restart" aria-label="最初から">最初から</button>
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
            </div>
            <div className="results-buttons">
              <button id="back-to-title">タイトルへ戻る</button>
              <button id="replay-song">もう一度プレイ</button>
            </div>
          </div>
        </div>

        {result && (
          <>
            <div className="pointer-events-auto absolute bottom-8 right-8 z-[1200] animate-fade-in-up">
               <button
                  onClick={() => setShowRanking(true)}
                  className="text-miku font-bold text-sm hover:text-white transition-colors flex items-center gap-2 group"
                  style={{ textShadow: '0 0 10px rgba(0,0,0,0.8)' }}
                >
                  ランキングを見る <span className="group-hover:translate-x-1 transition-transform">→</span>
               </button>
            </div>

            {showRanking && (
              <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-8 animate-fade-in">
                <div 
                  className="absolute inset-0 bg-black/90 backdrop-blur-md"
                  onClick={() => setShowRanking(false)}
                ></div>
                
                <div className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in">
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5">
                    <div className="flex items-center gap-4">
                      <div className="bg-miku/20 p-3 rounded-xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-miku" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 uppercase tracking-[0.2em]">Global Ranking</p>
                        <h2 className="text-2xl font-bold text-white">ランキング</h2>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <ModeTabs value={rankingMode} onChange={setRankingMode} />
                      <button 
                        onClick={() => setShowRanking(false)}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition border border-white/5"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-b from-[#0a0a0a] to-[#111]">
                    <RankingPanel 
                      songId={SONG_ID} 
                      mode={rankingMode} 
                      className="!bg-transparent !border-none !shadow-none p-0 h-full" 
                    />
                  </div>
                  
                  {/* Footer */}
                  {isSubmitting && (
                    <div className="p-3 bg-miku/10 border-t border-miku/20 text-center">
                      <p className="text-sm text-miku animate-pulse">スコア送信中...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}

export default GamePage

import { useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import GameManager from "../game/GameManager"
import { initLiveParticles, loadSongConfig } from "../game/gameLoader"
import { Slot } from "../components/game/Slot"
import "../styles.css"

function GamePage() {
  const { songData, accentColor } = useMemo(() => loadSongConfig(), [])

  useEffect(() => {
    const bodyClass = "game-body"
    document.body.classList.add(bodyClass)
    document.documentElement.style.setProperty("--bg-accent-color", accentColor)

    const titleEl = document.getElementById("song-title")
    if (titleEl) titleEl.textContent = songData.title
    const loadingEl = document.getElementById("loading")
    if (loadingEl) loadingEl.textContent = `${songData.title} をロード中...`

    initLiveParticles(document.getElementById("game-particles"))

    // Initialize GameManager after a short delay to ensure DOM is ready
    const timer = setTimeout(() => {
       const manager = new GameManager()
       const handleBeforeUnload = () => manager?.cleanup?.()
       window.gameManager = manager
   
       window.addEventListener("beforeunload", handleBeforeUnload)
    }, 100);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeunload", () => window.gameManager?.cleanup?.())
      try {
        window.gameManager?.cleanup?.()
      } catch (error) {
        console.error("Game cleanup error", error)
      }
      if (window.gameManager) {
        delete window.gameManager
      }
      document.body.classList.remove(bodyClass)
    }
  }, [accentColor, songData.title])

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
            <div id="loading">{`${songData.title} をロード中...`}</div>
          </div>

          <div id="score-container">
            <div id="score">0</div>
            <div id="combo">コンボ 0</div>
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
      </div>
    </>
  )
}

export default GamePage

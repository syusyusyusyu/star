import { useEffect, useMemo } from "react"
import { Helmet } from "react-helmet-async"
import GameManager from "../game/GameManager"
import { initLiveParticles, loadSongConfig } from "../game/gameLoader"
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

    const manager = new GameManager()
    const handleBeforeUnload = () => manager?.cleanup?.()
    window.gameManager = manager

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      try {
        manager?.cleanup?.()
      } catch (error) {
        console.error("Game cleanup error", error)
      }
      if (window.gameManager === manager) {
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
      <div className="relative w-full h-screen overflow-hidden">
        <video id="camera-video" className="hidden" />
        <canvas id="segmentation-canvas" className="fixed top-0 left-0 w-full h-full z-[1]" />

        <div
          id="countdown-overlay"
          className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-70 z-[1000] hidden"
        >
          <span id="countdown-text" className="text-white text-9xl font-bold"></span>
        </div>

        <div id="live-background" className="fixed top-0 left-0 w-full h-full z-0">
          <div
            id="stage-area"
            className="absolute top-0 left-0 w-full h-3/5 bg-gray-900 overflow-hidden flex justify-center items-end"
          >
            <div className="w-full h-1/4 bg-black/30" style={{ perspective: "50px" }}>
              <div className="w-full h-full bg-gray-700" style={{ transform: "rotateX(30deg)" }}></div>
            </div>

            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[200px] bg-gradient-to-t from-purple-600/30 to-transparent rounded-[100%] animate-pulse"></div>
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150px] bg-gradient-to-t from-blue-500/40 to-transparent rounded-[100%]"
              style={{ animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite", animationDelay: "500ms" }}
            ></div>

            <div
              className="absolute top-10 left-1/4 w-48 h-48 bg-gradient-radial from-cyan-400/20 via-cyan-400/10 to-transparent rounded-full blur-3xl"
              style={{ animation: "rotateSpotlight1 20s linear infinite" }}
            ></div>
            <div
              className="absolute top-10 right-1/4 w-48 h-48 bg-gradient-radial from-pink-400/20 via-pink-400/10 to-transparent rounded-full blur-3xl"
              style={{ animation: "rotateSpotlight2 25s linear infinite" }}
            ></div>
            <div
              className="absolute top-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-radial from-purple-400/20 via-purple-400/10 to-transparent rounded-full blur-3xl"
              style={{ animation: "rotateSpotlight3 18s linear infinite" }}
            ></div>

            <div
              className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-30"
              style={{ left: "20%", boxShadow: "0 0 10px #39C5BB", animation: "laserBeam1 4s ease-in-out infinite" }}
            ></div>
            <div
              className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-pink-400 to-transparent opacity-30"
              style={{ left: "50%", boxShadow: "0 0 10px #FF69B4", animation: "laserBeam2 4s ease-in-out infinite 1.3s" }}
            ></div>
            <div
              className="absolute top-0 w-0.5 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-30"
              style={{ left: "80%", boxShadow: "0 0 10px #39C5BB", animation: "laserBeam3 4s ease-in-out infinite 2.6s" }}
            ></div>
          </div>

          <div
            id="audience-area"
            className="absolute bottom-0 left-0 w-full h-2/5 bg-gradient-to-t from-black via-gray-900/80 to-transparent"
          >
            <div
              className="absolute bottom-0 left-0 w-full h-full opacity-40 overflow-hidden"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, transparent 0px, transparent 15px, rgba(0,0,0,0.8) 15px, rgba(0,0,0,0.8) 20px)",
                animation: "audienceWave 4s ease-in-out infinite",
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

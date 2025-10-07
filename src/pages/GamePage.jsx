import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import '../styles/game.css'

export default function GamePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const gameInitialized = useRef(false)

  useEffect(() => {
    // DOMContentLoaded相当の処理
    const handleDOMReady = () => {
      // 曲情報の取得と設定
      const selectedSongData = JSON.parse(localStorage.getItem('selectedSong') || 'null')
      
      const defaultSong = {
        id: 1,
        title: "SUPERHERO",
        artist: "めろくる",
        apiToken: "wifkp8ak1TEhQ8pI",
        songUrl: "https://piapro.jp/t/hZ35/20240130103028"
      }
      
      const songData = selectedSongData || defaultSong
      
      // 色のバリエーション
      const colorVariations = {
        easy: 'rgba(57, 197, 187, 0.1)',
        normal: 'rgba(255, 165, 0, 0.1)',
        hard: 'rgba(255, 105, 180, 0.1)'
      }
      
      // UI更新
      const songTitleEl = document.getElementById('song-title')
      const loadingEl = document.getElementById('loading')
      
      if (songTitleEl) songTitleEl.textContent = songData.title
      if (loadingEl) loadingEl.textContent = `${songData.title} をロード中...`
      
      // CSS変数を設定
      document.documentElement.style.setProperty(
        '--bg-accent-color', 
        colorVariations[songData.difficulty] || 'rgba(57, 197, 187, 0.1)'
      )
      
      // GameManagerが初期化される前にグローバル変数として設定
      window.songConfig = {
        apiToken: songData.apiToken,
        songUrl: songData.songUrl
      }
    }
    
    // window.load相当の処理
    const handleWindowLoad = () => {
      let attempts = 0
      const maxAttempts = 5
      
      const initGameManager = () => {
        attempts++
        
        if (window.songConfig && typeof GameManager === 'function' && !window.gameManager) {
          try {
            window.gameManager = new GameManager()
            
            // ページ離脱時のクリーンアップ
            window.addEventListener('beforeunload', () => {
              if (window.gameManager) window.gameManager.cleanup()
            })
          } catch (error) {
            console.error("Game manager initialization error:", error)
            if (attempts < maxAttempts) {
              setTimeout(initGameManager, 300)
            }
          }
        } else if (attempts < maxAttempts && !window.gameManager) {
          setTimeout(initGameManager, 300)
        }
      }
      
      // script.jsが確実に読み込まれるよう少し待機
      setTimeout(initGameManager, 1000)
    }
    
    if (!gameInitialized.current) {
      gameInitialized.current = true
      handleDOMReady()
      
      if (document.readyState === 'complete') {
        handleWindowLoad()
      } else {
        window.addEventListener('load', handleWindowLoad)
      }
    }
    
    // クリーンアップ
    return () => {
      if (window.gameManager && typeof window.gameManager.cleanup === 'function') {
        window.gameManager.cleanup()
      }
    }
  }, [searchParams])

  const handleBackToTitle = () => {
    navigate('/')
  }

  return (
    <div className="browser-bar-adjust">
      <video id="camera-video" className="hidden"></video>
      <canvas id="segmentation-canvas" className="fixed top-0 left-0 w-full h-full z-[1]"></canvas>
      
      <div id="countdown-overlay" className="fixed top-0 left-0 w-full h-full flex justify-center items-center bg-black bg-opacity-70 z-[1000] hidden">
        <span id="countdown-text" className="text-white text-9xl font-bold"></span>
      </div>
      
      <div id="live-background" className="fixed top-0 left-0 w-full h-full z-[-1]">
        <div id="stage-area" className="absolute top-0 left-0 w-full h-3/5 bg-gray-900 overflow-hidden flex justify-center items-end">
          <div className="w-full h-1/4 bg-black/30" style={{perspective: '50px'}}>
            <div className="w-full h-full bg-gray-700" style={{transform: 'rotateX(30deg)'}}></div>
          </div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[200%] h-[200px] bg-gradient-to-t from-purple-600/30 to-transparent rounded-[100%] animate-pulse"></div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[150%] h-[150px] bg-gradient-to-t from-blue-500/40 to-transparent rounded-[100%]" style={{animationDelay: '500ms'}}></div>
        </div>
        <div id="audience-area" className="absolute bottom-0 left-0 w-full h-2/5"></div>
      </div>
      
      <div id="game-container">
        <div id="miku"></div>
        <div id="song-info">
          <div id="song-title">Lyricほにゃらら</div>
          <div id="loading">ゲームをロード中...</div>
        </div>
        
        <div id="score-container">
          <div id="score">0</div>
          <div id="combo">コンボ: 0</div>
        </div>
        
        <div id="instructions">歌詞の文字にマウスを当ててポイントを獲得しよう！</div>
        
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
              <div id="final-combo-display">最大コンボ: 0</div>
              <div id="rank-display">ランク: S</div>
            </div>
          </div>
          <div className="results-buttons">
            <button id="back-to-title" onClick={handleBackToTitle}>タイトルへ戻る</button>
            <button id="replay-song">もう一度プレイ</button>
          </div>
        </div>
      </div>
    </div>
  )
}

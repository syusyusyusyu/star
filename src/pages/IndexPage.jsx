import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import songsData from '../data/songs'
import '../styles/index.css'

export default function IndexPage() {
  const navigate = useNavigate()
  const [gameMode, setGameMode] = useState('cursor')
  const [showHelp, setShowHelp] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // モバイル検出
    const detectMobile = () => {
      const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const smallScreen = window.innerWidth <= 768
      return mobileUA || (hasTouch && smallScreen)
    }
    
    const mobile = detectMobile()
    setIsMobile(mobile)
    if (mobile) {
      setGameMode('cursor')
    }
    
    createStars()
    
    const handleResize = () => {
      clearTimeout(window.resizeTimer)
      window.resizeTimer = setTimeout(createStars, 250)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const createStars = () => {
    const container = document.getElementById('stars-container')
    if (!container) return
    
    const starCount = Math.min(100, Math.floor(window.innerWidth * window.innerHeight / 6000))
    container.innerHTML = ''
    
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 100}%`
      star.style.animationDelay = `${Math.random() * 3}s`
      
      if (Math.random() > 0.7) {
        star.style.width = '6px'
        star.style.height = '6px'
        star.style.boxShadow = '0 0 10px #fff'
      }
      
      container.appendChild(star)
    }
  }

  const handleSongSelect = (song) => {
    localStorage.setItem('selectedSong', JSON.stringify(song))
    navigate(`/game?mode=${gameMode}`)
  }

  return (
    <div className="bg-gradient-to-b from-gradientStart to-darkBg min-h-screen w-full text-white browser-bar-adjust flex justify-center items-center">
      <div id="stars-container" className="fixed top-0 left-0 w-full h-full z-0"></div>
      
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center justify-center py-6 px-4 min-h-screen">
        {/* ロゴ */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-miku mb-2 tracking-wider">
            Lyric Stage
          </h1>
        </div>
        
        {/* 説明テキスト */}
        <div className="max-w-md mx-auto text-center mb-4 sm:mb-6 bg-black/30 p-2 sm:p-2 rounded-lg backdrop-blur-sm">
          <p className="text-white/90 text-sm sm:text-base">
            {isMobile ? '歌詞の文字をタップしてポイントを獲得しよう！（モバイル最適化）' : '歌詞に触れてポイントを獲得しよう！'}
          </p>
        </div>

        {/* モード選択 */}
        <div className="mt-4 mb-6 text-center">
          <label htmlFor="game-mode" className="text-white mr-2 text-lg">
            {isMobile ? 'Playモード: Cursorモード（モバイル専用）' : 'Playモード選択:'}
          </label>
          <select
            id="game-mode"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value)}
            disabled={isMobile}
            className="p-2 rounded bg-gray-700 text-white text-lg"
            style={isMobile ? {
              backgroundColor: '#4a5568',
              color: '#a0aec0',
              cursor: 'not-allowed'
            } : {}}
          >
            <option value="cursor">Cursorモード</option>
            <option value="hand">Handモード</option>
            <option value="body">Bodyモード</option>
          </select>
        </div>
        
        {/* 曲選択 */}
        <div className="max-w-lg w-full mx-auto">
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" id="song-list">
            {songsData.map((song) => (
              <li
                key={song.id}
                className="song-item bg-black/40 rounded-lg backdrop-blur-sm border border-miku/30 w-full"
              >
                <button
                  onClick={() => handleSongSelect(song)}
                  className="w-full p-4 text-left flex justify-between items-center focus:outline-none"
                >
                  <div>
                    <h3 className="text-xl text-miku font-medium">{song.title}</h3>
                    <p className="text-white/70 text-sm">{song.artist}</p>
                  </div>
                  <div className="bg-miku text-white px-4 py-2 rounded-lg">
                    プレイ
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* ヘルプボタン */}
      <button
        onClick={() => setShowHelp(true)}
        className="fixed bottom-4 right-4 bg-miku-400 hover:bg-miku-300 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-miku-500 miku-glow z-20"
      >
        ルール説明
      </button>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div className="fixed inset-0 z-30">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-4 p-6 rounded-xl bg-space-800/90 border border-miku-400 shadow-2xl animate-fade-in text-sm leading-relaxed">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-bold text-miku-300">ルール説明</h2>
                <button
                  onClick={() => setShowHelp(false)}
                  className="text-miku-300 hover:text-miku-100 transition text-xl px-2"
                >
                  ×
                </button>
              </div>
              
              <section className="p-4 bg-space-800 bg-opacity-80 rounded-lg border border-miku-400">
                <h3 className="font-medium text-miku-300 mb-1.5">基本操作</h3>
                <p>このゲームでは、選択した曲の歌詞がタイミングに合わせて流れてきます。歌詞に触れてスコアとコンボを伸ばしましょう。</p>
              </section>
              
              <section>
                <h3 className="font-medium text-miku-300 mb-2 flex items-center gap-2">
                  🛰️ 操作手順
                </h3>
                <ol className="list-decimal pl-6 space-y-2 text-miku-100">
                  <li>プレイモードを選択（PCなら Hand / Body も使用可）。</li>
                  <li>曲リストから曲を選び「プレイ」を押す。</li>
                  <li>歌詞が表示されたらモードに応じてヒット（クリック / 手 / 体）。</li>
                  <li>タイミングよく全てヒットしてコンボを伸ばす。</li>
                  <li>曲終了後にスコアとランクを確認。</li>
                </ol>
              </section>
              
              <section>
                <h3 className="font-medium text-miku-300 mb-2 flex items-center gap-2">
                  🎛️ 表示の説明
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-miku-100">
                  <li>歌詞バブル: タイミングに合わせて出現・移動。</li>
                  <li>スコア / コンボ: 画面上部に表示。</li>
                  <li>モード別入力: Cursor=クリック / Hand=指の先 / Body=腕や手。</li>
                </ul>
              </section>
              
              <section className="p-4 bg-space-800 bg-opacity-80 rounded-lg border border-miku-400">
                <h3 className="font-medium text-miku-300 mb-2 flex items-center gap-2">
                  📱 モバイル操作
                </h3>
                <ul className="list-disc pl-6 space-y-1 text-miku-100 text-sm">
                  <li>モードは Cursor に固定（軽量化のため）。</li>
                  <li>歌詞をタップしてスコア獲得。</li>
                </ul>
              </section>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowHelp(false)}
                  className="inline-flex items-center px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-gradient-to-r from-miku-400 to-miku-600 hover:from-miku-300 hover:to-miku-500 focus:outline-none focus:ring-2 focus:ring-miku-500 transition-all duration-200 transform hover:scale-105 miku-glow"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

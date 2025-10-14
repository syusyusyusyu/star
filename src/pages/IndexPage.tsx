import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { songsData, type GameMode, type Song } from '../types/game'
import '../index-styles.css'

export default function IndexPage() {
  const navigate = useNavigate()
  const [gameMode, setGameMode] = useState<GameMode>('cursor')
  const [showHelp, setShowHelp] = useState(false)
  const helpModalRef = useRef<HTMLDivElement>(null)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    // 星エフェクトを作成
    createStars()

    // リサイズ時に星の数を調整
    const handleResize = () => {
      createStars()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const createStars = () => {
    const starsContainer = document.getElementById('stars-container')
    if (!starsContainer) return

    const starCount = Math.min(100, Math.floor(window.innerWidth * window.innerHeight / 6000))
    starsContainer.innerHTML = ''

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div')
      star.className = 'star'
      star.style.left = `${Math.random() * 100}%`
      star.style.top = `${Math.random() * 100}%`
      star.style.animationDelay = `${Math.random() * 3}s`
      star.style.animationDuration = `${2 + Math.random() * 2}s`
      starsContainer.appendChild(star)
    }
  }

  const handleSongSelect = (song: Song) => {
    localStorage.setItem('selectedSong', JSON.stringify({
      ...song,
      difficulty: 'easy'
    }))
    localStorage.setItem('gameMode', gameMode)
    
    // エフェクトアニメーション
    const songItem = document.getElementById(`song-${song.id}`)
    if (songItem) {
      songItem.style.transform = 'scale(0.95)'
      setTimeout(() => {
        songItem.style.transform = ''
      }, 150)
    }

    setTimeout(() => {
      navigate(`/game?mode=${gameMode}`)
    }, 200)
  }

  const createClickEffect = (e: React.MouseEvent, element: HTMLElement) => {
    const ripple = document.createElement('div')
    const rect = element.getBoundingClientRect()
    const relX = e.clientX - rect.left
    const relY = e.clientY - rect.top

    ripple.className = 'absolute bg-white/40 rounded-full pointer-events-none'
    ripple.style.width = '100px'
    ripple.style.height = '100px'
    ripple.style.left = `${relX}px`
    ripple.style.top = `${relY}px`
    ripple.style.transform = 'translate(-50%, -50%) scale(0)'
    ripple.style.animation = 'ripple 0.6s ease-out forwards'

    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)

    setTimeout(() => ripple.remove(), 600)
  }

  const openHelp = () => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement
    setShowHelp(true)
    setTimeout(() => {
      const closeBtn = document.getElementById('close-help-btn')
      if (closeBtn) closeBtn.focus()
    }, 100)
  }

  const closeHelp = () => {
    setShowHelp(false)
    if (lastFocusedElementRef.current) {
      lastFocusedElementRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && showHelp) {
      closeHelp()
    }
  }

  return (
    <div className="bg-gradient-to-b from-gradientStart to-darkBg min-h-screen w-full text-white">
      <div id="stars-container" className="fixed top-0 left-0 w-full h-full z-0"></div>
      
      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-xl flex flex-col items-center justify-center py-8 px-4 mx-auto">
        {/* ロゴ */}
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-bold text-miku mb-2 tracking-wider">Lyric Stage</h1>
        </div>
        
        {/* 説明テキスト */}
        <div className="max-w-md mx-auto text-center mb-4 sm:mb-6 bg-black/30 p-2 sm:p-2 rounded-lg backdrop-blur-sm">
          <p className="text-white/90 text-sm sm:text-base">歌詞に触れてポイントを獲得しよう！</p>
        </div>

        {/* モード選択 */}
        <div id="mode-selection" className="mt-4 mb-6 text-center">
          <label htmlFor="game-mode" className="text-white mr-2 text-lg">Playモード選択:</label>
          <select 
            id="game-mode" 
            className="p-2 rounded bg-gray-700 text-white text-lg"
            value={gameMode}
            onChange={(e) => setGameMode(e.target.value as GameMode)}
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
                id={`song-${song.id}`}
                className="song-item bg-gradient-to-r from-miku-600/40 to-miku-500/40 p-4 rounded-lg cursor-pointer hover:shadow-lg transition-all"
                onClick={(e) => {
                  createClickEffect(e, e.currentTarget)
                  handleSongSelect(song)
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)'
                  e.currentTarget.style.boxShadow = '0 0 20px rgba(57, 197, 187, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = ''
                  e.currentTarget.style.boxShadow = ''
                }}
              >
                <h3 className="text-lg font-bold text-white mb-1">{song.title}</h3>
                <p className="text-sm text-white/70">{song.artist}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* ヘルプボタン（右下固定） */}
      <button
        id="open-help-btn"
        onClick={openHelp}
        className="fixed bottom-4 right-4 bg-miku-400 hover:bg-miku-300 text-white font-semibold px-4 py-2 rounded-lg shadow-lg transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-miku-500 miku-glow z-20"
      >
        ルール説明
      </button>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div
          id="help-modal"
          ref={helpModalRef}
          className="fixed inset-0 z-30"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          {/* 背景 */}
          <div
            id="help-backdrop"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={closeHelp}
          ></div>
          {/* コンテンツ */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto space-y-4 p-6 rounded-xl bg-space-800/90 border border-miku-400 shadow-2xl animate-fade-in text-sm leading-relaxed">
              <div className="flex justify-between items-start mb-2">
                <h2 id="help-modal-title" className="text-2xl font-bold text-miku-300">ルール説明</h2>
                <button
                  id="close-help-btn-top"
                  onClick={closeHelp}
                  className="text-miku-300 hover:text-miku-100 transition text-xl px-2"
                  aria-label="閉じる"
                >
                  ×
                </button>
              </div>
              {/* セクション: 基本操作 */}
              <section className="p-4 bg-space-800 bg-opacity-80 rounded-lg border border-miku-400">
                <h3 className="font-medium text-miku-300 mb-1.5">基本操作</h3>
                <p>このゲームでは、選択した曲の歌詞がタイミングに合わせて流れてきます。歌詞に触れてスコアとコンボを伸ばしましょう。</p>
              </section>
              <section>
                <h3 className="font-medium text-miku-300 mb-2 flex items-center gap-2">🛰️ 操作手順</h3>
                <ol className="list-decimal pl-6 space-y-2 text-miku-100">
                  <li>プレイモードを選択（PCなら Hand / Body も使用可）。</li>
                  <li>曲リストから曲を選び「プレイ」を押す。</li>
                  <li>歌詞が表示されたらモードに応じてヒット（クリック / 手 / 体）。</li>
                  <li>タイミングよく全てヒットしてコンボを伸ばす。</li>
                  <li>曲終了後にスコアとランクを確認。</li>
                </ol>
              </section>
              {/* 表示説明 */}
              <section>
                <h3 className="font-medium text-miku-300 mb-2 flex items-center gap-2">🎛️ 表示の説明</h3>
                <ul className="list-disc pl-6 space-y-2 text-miku-100">
                  <li>歌詞バブル: タイミングに合わせて出現・移動。</li>
                  <li>スコア / コンボ: 画面上部に表示。</li>
                  <li>モード別入力: Cursor=クリック / Hand=指の先 / Body=腕や手。</li>
                </ul>
              </section>
              <div className="mt-4 flex justify-end">
                <button
                  id="close-help-btn"
                  onClick={closeHelp}
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

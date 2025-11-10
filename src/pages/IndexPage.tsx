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
    <div className="live-venue-bg min-h-screen w-full text-white relative overflow-hidden" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
      {/* ライブ会場背景 */}
      <div className="fixed inset-0 z-0">
        {/* ステージ床 */}
        <div className="stage-floor"></div>
        {/* 観客シルエット */}
        <div className="audience-silhouettes"></div>
        {/* スポットライト効果 */}
        <div className="spotlight spotlight-1"></div>
        <div className="spotlight spotlight-2"></div>
        <div className="spotlight spotlight-3"></div>
        {/* レーザー効果 */}
        <div className="laser-effect">
          <div className="laser-beam"></div>
          <div className="laser-beam"></div>
          <div className="laser-beam"></div>
        </div>
      </div>
      
      {/* 星エフェクト（照明効果に変更） */}
      <div id="stars-container" className="fixed top-0 left-0 w-full h-full z-1 lighting-effects"></div>
      
      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center justify-center py-4 px-4 mx-auto min-h-screen" style={{ touchAction: 'pan-y' }}>
        {/* ネオンサイン風ロゴ */}
        <div className="text-center mb-4">
          <div className="neon-sign-container">
            <h1 className="neon-text text-4xl sm:text-5xl md:text-6xl font-bold mb-2 tracking-wider">
              クロステ
            </h1>
            <div className="neon-underline"></div>
          </div>
          <p className="live-subtitle mt-2 text-sm sm:text-base">Cross Stage</p>
        </div>
        
        {/* ライブ情報バナー（コンパクト版） */}
        <div className="live-info-banner w-full mb-3 py-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl" role="img" aria-label="マイク">🎤</span>
              <div>
                <p className="text-xs text-gray-400">TextAlive App API</p>
              </div>
            </div>
            <button 
              onClick={openHelp}
              className="miku-glow px-4 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white text-sm font-bold rounded-lg transition-all duration-300 shadow-lg transform hover:scale-105"
              aria-label="操作方法を表示"
            >
              ルール説明
            </button>
          </div>
        </div>
        
        {/* モード選択（VIPチケット風） */}
        <div id="mode-selection" className="w-full mb-3">
          <h2 className="text-center text-lg font-bold text-white mb-3 ticket-header">モード選択</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['cursor', 'hand', 'body'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGameMode(mode)}
                className={`vip-ticket ${gameMode === mode ? 'vip-ticket-selected' : ''}`}
              >
                <div className="ticket-mode">
                  {mode === 'cursor' && 'Cursor'}
                  {mode === 'hand' && 'Hand'}
                  {mode === 'body' && 'Body'}
                </div>
                <div className="ticket-desc">
                  {mode === 'cursor' && 'マウスで歌詞をクリック'}
                  {mode === 'hand' && 'カメラで手を認識'}
                  {mode === 'body' && 'カメラで全身を認識'}
                </div>
                <div className="ticket-barcode"></div>
              </button>
            ))}
          </div>
        </div>
        
        {/* 曲選択（セットリスト風） */}
        <div className="w-full">
          <h2 className="text-center text-lg font-bold text-white mb-3 setlist-header">楽曲リスト</h2>
          <div className="max-h-[32vh] overflow-y-auto pr-2 compact-scrollbar">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2" id="song-list">
            {songsData.map((song, index) => (
              <li
                key={song.id}
                id={`song-${song.id}`}
                className="setlist-item"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={(e) => {
                  createClickEffect(e, e.currentTarget)
                  handleSongSelect(song)
                }}
              >
                <div className="setlist-number">{String(index + 1).padStart(2, '0')}</div>
                <div className="setlist-content">
                  <h3 className="setlist-title">{song.title}</h3>
                  <p className="setlist-artist">{song.artist}</p>
                </div>
                <div className="setlist-play-icon">▶</div>
              </li>
            ))}
            </ul>
          </div>
        </div>
      </div>

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
                <h3 className="font-medium text-miku-300 mb-2">操作手順</h3>
                <ol className="list-decimal pl-6 space-y-2 text-miku-100">
                  <li>プレイモードを選択</li>
                  <li>曲リストから曲を選び「プレイ」を押す。</li>
                  <li>歌詞が表示されたらモードに応じてヒット（クリック / 手 / 体）。</li>
                  <li>タイミングよく全てヒットしてコンボを伸ばす。</li>
                  <li>曲終了後にスコアとランクを確認。</li>
                </ol>
              </section>
              {/* 表示説明 */}
              <section>
                <h3 className="font-medium text-miku-300 mb-2">表示の説明</h3>
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

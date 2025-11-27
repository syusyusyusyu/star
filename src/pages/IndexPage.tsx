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
    // リサイズイベントのクリーンアップのみ
    return () => {
      // クリーンアップ処理があればここに記述
    }
  }, [])

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
        {/* Cross Beam Background */}
        <div className="cross-beam-bg">
            <div className="beam"></div>
            <div className="beam"></div>
            <div className="beam"></div>
            <div className="beam"></div>
        </div>
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
      
      {/* メインコンテンツ */}
      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center justify-center py-8 px-6 mx-auto min-h-screen" style={{ touchAction: 'pan-y' }}>
        
        {/* タイトルエリア */}
        <div className="w-full mb-16 flex flex-col items-center">
            <div className="cross-logo-container transform scale-90 sm:scale-100">
            <div className="cross-x"></div>
            <h1 className="cross-logo-text text-5xl sm:text-6xl md:text-7xl leading-tight tracking-tight">
                クロステ
            </h1>
            </div>
            <p className="live-subtitle mt-4 text-sm sm:text-base tracking-[0.3em] text-gray-400 font-medium uppercase">Cross Stage</p>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-16 items-start justify-center">
            {/* 左カラム: モード選択 & Info */}
            <div className="w-full md:w-5/12 flex flex-col gap-8">
                {/* Info Banner */}
                <div className="text-right border-b border-miku/50 pb-2 flex justify-between items-end">
                    <div className="text-left">
                        <p className="text-[10px] text-gray-500 tracking-widest">POWERED BY TEXTALIVE</p>
                        <p className="text-[10px] text-gray-500 tracking-widest">SONGLE</p>
                    </div>
                    <button onClick={openHelp} className="text-miku font-bold text-sm hover:text-white transition-colors flex items-center gap-2 group">
                        遊び方を見る <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                </div>

                {/* Mode Selection */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider mb-2">モード選択</h2>
                    {(['cursor', 'body'] as const).map((mode) => (
                        <button
                            key={mode}
                            onClick={() => setGameMode(mode)}
                            className={`group relative p-6 border transition-all duration-300 text-left overflow-hidden rounded-lg ${
                                gameMode === mode 
                                ? 'border-miku bg-miku/20 shadow-[0_0_15px_rgba(57,197,187,0.3)]' 
                                : 'border-white/20 hover:border-white/40 bg-white/5'
                            }`}
                        >
                            <div className={`absolute inset-0 bg-miku/5 translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300 ${gameMode === mode ? 'translate-x-0' : ''}`}></div>
                            <div className="relative z-10 flex justify-between items-center">
                                <div>
                                    <h3 className={`text-xl font-bold ${gameMode === mode ? 'text-white' : 'text-gray-300'}`}>
                                        {mode === 'cursor' ? 'マウスモード' : 'カメラモード'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {mode === 'cursor' ? 'マウスで歌詞をキャッチ！' : '全身を使って歌詞をキャッチ！'}
                                    </p>
                                </div>
                                {gameMode === mode && <div className="text-2xl text-miku">●</div>}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 右カラム: ゲーム開始エリア */}
            <div className="w-full md:w-7/12 relative flex flex-col justify-center h-full min-h-[300px]">
                <h2 className="text-8xl font-black text-white/5 absolute -z-10 -right-4 top-0 pointer-events-none select-none font-sans">START</h2>
                
                <div className="w-full pt-8 flex flex-col gap-8">
                    {/* 曲情報表示 */}
                    <div className="bg-white/5 rounded-xl p-6 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1 h-4 bg-miku rounded-full"></span>
                            <p className="text-gray-400 text-xs font-bold">プレイする楽曲</p>
                        </div>
                        <h3 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
                            {songsData[0].title}
                        </h3>
                        <p className="text-miku text-sm font-bold">
                            {songsData[0].artist}
                        </p>
                    </div>

                    {/* スタートボタン */}
                    <button
                        onClick={(e) => {
                            createClickEffect(e, e.currentTarget)
                            handleSongSelect(songsData[0])
                        }}
                        className="group relative w-full bg-gradient-to-r from-miku/80 to-blue-500/80 hover:from-miku hover:to-blue-500 transition-all duration-300 py-6 px-8 rounded-xl shadow-lg hover:shadow-miku/50 hover:-translate-y-1"
                    >
                        <div className="relative z-10 flex items-center justify-center gap-4">
                            <span className="text-2xl font-bold text-white tracking-widest">ゲームスタート</span>
                            <span className="text-2xl text-white animate-pulse">▶</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div
          id="help-modal"
          ref={helpModalRef}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <div
            id="help-backdrop"
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={closeHelp}
          ></div>
          
          <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto crossover-panel p-8 rounded-lg animate-fade-in">
              <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
                <h2 id="help-modal-title" className="text-3xl font-bold text-white tracking-tight">遊び方</h2>
                <button
                  onClick={closeHelp}
                  className="text-gray-400 hover:text-white transition text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-8 text-gray-300">
                  <section>
                    <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="w-1 h-6 bg-miku block"></span>
                        基本ルール
                    </h3>
                    <p className="leading-relaxed">
                        音楽に合わせて流れてくる歌詞をタイミングよくキャッチするリズムゲームです。
                        歌詞に触れることでスコアとコンボが加算されます。
                    </p>
                  </section>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <section className="bg-white/5 p-4 rounded border border-white/5">
                        <h3 className="text-white font-bold mb-2">マウスモード</h3>
                        <p className="text-sm">マウスカーソルを使って歌詞をクリックまたはホバーします。</p>
                      </section>
                      <section className="bg-white/5 p-4 rounded border border-white/5">
                        <h3 className="text-white font-bold mb-2">カメラモード</h3>
                        <p className="text-sm">Webカメラを使用し、体の動きで歌詞に触れます。</p>
                      </section>
                  </div>

                  <section>
                    <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="w-1 h-6 bg-miku block"></span>
                        プレイの流れ
                    </h3>
                    <ol className="list-decimal pl-5 space-y-2 marker:text-miku">
                      <li>プレイモード（マウス / カメラ）を選択</li>
                      <li>「ゲームスタート」ボタンをクリック</li>
                      <li>タイミングよく歌詞をキャッチ！</li>
                      <li>曲が終わるとリザルト画面へ</li>
                    </ol>
                  </section>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={closeHelp}
                  className="miku-glow px-8 py-3 rounded text-white font-bold"
                >
                  閉じる
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

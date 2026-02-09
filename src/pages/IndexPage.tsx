import { useEffect, useState, useRef, memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { songsData, type GameMode, type PlayMode, type Song } from '../types/game'
import RankingModal from '../components/game/RankingModal'
import '../index-styles.css'

const SONG_ID = 'HmfsoBVch26BmLCm'

// ヘルプモーダル（メモ化で再レンダリング削減）
const HelpModal = memo(function HelpModal({
  show,
  onClose,
  isMobile,
}: {
  show: boolean
  onClose: () => void
  isMobile: boolean
}) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  if (!show) return null

  return (
    <div
      id="help-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div
        id="help-backdrop"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      ></div>
      
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto crossover-panel p-8 rounded-lg animate-fade-in">
          <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
            <h2 id="help-modal-title" className="text-3xl font-bold text-white tracking-tight">遊び方</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-8 text-gray-300">
              {isMobile ? (
                <>
                  <section>
                    <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="w-1 h-6 bg-miku block"></span>
                        モバイルモードの遊び方
                    </h3>
                    <p className="leading-relaxed">
                        音楽に合わせて流れてくる歌詞を指でタップ＆ホールドするリズムゲームです。
                        歌詞バブルを長押ししてゲージを溜めることでスコアが加算されます。
                    </p>
                  </section>
                  <section className="bg-white/5 p-4 rounded border border-white/5">
                    <h3 className="text-white font-bold mb-2">操作方法</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li>画面上の歌詞バブルを直接タップします。</li>
                        <li>バブルが表示されている間、指を離さずに押し続けてください（ホールド）。</li>
                        <li>ゲージがMAXになるとコンボが繋がります。</li>
                    </ul>
                  </section>

                  <section>
                    <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                        <span className="w-1 h-6 bg-miku block"></span>
                        フェイスモードの遊び方
                    </h3>
                    <p className="leading-relaxed">
                        内カメラで顔の動きを認識するモードです。
                        ターゲットサークル内に表示される歌詞バブルに口の位置を合わせ、口を大きく開けることでホールドします。
                    </p>
                  </section>
                  <section className="bg-white/5 p-4 rounded border border-white/5">
                    <h3 className="text-white font-bold mb-2">操作方法</h3>
                    <ul className="list-disc pl-5 space-y-2 text-sm">
                        <li>歌詞バブルが表示されたら、顔を動かして口の位置を合わせます。</li>
                        <li>位置が合ったら、口を「あ」と大きく開けてください（ホールド）。</li>
                        <li>口を閉じるとホールドが解除されます。</li>
                    </ul>
                  </section>
                </>
              ) : (
                <>
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
                        <h3 className="text-white font-bold mb-2">カーソルモード</h3>
                        <p className="text-sm">マウスカーソルを使って歌詞をクリックまたはホバーします。</p>
                      </section>
                      <section className="bg-white/5 p-4 rounded border border-white/5">
                        <h3 className="text-white font-bold mb-2">ボディモード</h3>
                        <p className="text-sm">Webカメラを使用し、体の動きで歌詞に触れます。</p>
                      </section>
                  </div>
                </>
              )}

              <section>
                <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-1 h-6 bg-miku block"></span>
                    速度コース（難易度）
                </h3>
                <p className="leading-relaxed mb-3">
                    歌詞バブルの表示時間を3段階から選べます。表示時間が短いほどバブルが速く消えるため、難易度が上がります。
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/5 p-3 rounded border border-white/5 text-center">
                        <div className="text-white font-bold">8秒</div>
                        <div className="text-xs text-red-400 mt-1">難しい</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded border border-miku/30 text-center">
                        <div className="text-white font-bold">10秒</div>
                        <div className="text-xs text-miku mt-1">普通</div>
                    </div>
                    <div className="bg-white/5 p-3 rounded border border-white/5 text-center">
                        <div className="text-white font-bold">12秒</div>
                        <div className="text-xs text-green-400 mt-1">易しい</div>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                    ※ ランキングはコース別にフィルタリングできます。
                </p>
              </section>

              <section>
                <h3 className="text-miku font-bold text-lg mb-2 flex items-center gap-2">
                    <span className="w-1 h-6 bg-miku block"></span>
                    プレイの流れ
                </h3>
                <ol className="list-decimal pl-5 space-y-2 marker:text-miku">
                  {isMobile ? (
                    <>
                      <li>速度コース（8秒/10秒/12秒）を選択</li>
                      <li>「ゲームスタート」をタップ</li>
                      <li>歌詞バブルをタップ＆ホールド！</li>
                      <li>曲が終わるとリザルト画面へ</li>
                    </>
                  ) : (
                    <>
                      <li>プレイモード（カーソル / ボディ）を選択</li>
                      <li>速度コース（8秒/10秒/12秒）を選択</li>
                      <li>「ゲームスタート」ボタンをクリック</li>
                      <li>タイミングよく歌詞をキャッチ！</li>
                      <li>曲が終わるとリザルト画面へ</li>
                    </>
                  )}
                </ol>
              </section>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onClose}
              className="miku-glow px-8 py-3 rounded text-white font-bold"
            >
              閉じる
            </button>
          </div>
      </div>
    </div>
  )
})

export default function IndexPage() {
  const navigate = useNavigate()
  const detectPreferredMode = () => {
    if (typeof window === 'undefined') return 'cursor' as GameMode
    const normalize = (mode: string | null): PlayMode | null =>
      mode === 'cursor' || mode === 'body' || mode === 'mobile' || mode === 'face' ? mode : null
    const stored = normalize(localStorage.getItem('gameMode'))
    const prefersTouch =
      window.matchMedia('(max-width: 820px)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0

    if (prefersTouch) {
      if (stored === 'cursor' || stored === 'mobile') return stored
      return 'mobile'
    }

    return stored ?? 'cursor'
  }
  const [gameMode, setGameMode] = useState<GameMode>(detectPreferredMode)
  const [speed, setSpeed] = useState<number>(() => {
    const stored = localStorage.getItem('gameSpeed')
    const parsed = stored ? parseInt(stored, 10) : 10
    return [8, 10, 12].includes(parsed) ? parsed : 10
  })
  const [showHelp, setShowHelp] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const lastFocusedElementRef = useRef<HTMLElement | null>(null)
  const isMobile = typeof window !== 'undefined'
    ? (window.matchMedia('(max-width: 820px)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0)
    : false
  const availableModes = useMemo(
    () => (['cursor', 'body', 'mobile', 'face'] as const).filter((m) =>
      isMobile ? (m === 'mobile' || m === 'face') : (m !== 'mobile' && m !== 'face')
    ),
    [isMobile]
  )

  useEffect(() => {
    if (!availableModes.includes(gameMode as any)) {
      setGameMode(isMobile ? 'mobile' : 'cursor')
    }
  }, [availableModes, gameMode, isMobile])

  useEffect(() => {
    try {
      sessionStorage.removeItem('returnToTitle')
    } catch {}
  }, [])

  const handleSongSelect = useCallback((song: Song) => {
    localStorage.setItem('selectedSong', JSON.stringify({
      ...song,
      difficulty: 'easy'
    }))
    localStorage.setItem('gameMode', gameMode)
    localStorage.setItem('gameSpeed', String(speed))

    // エフェクトアニメーション
    const songItem = document.getElementById(`song-${song.id}`)
    if (songItem) {
      songItem.style.transform = 'scale(0.95)'
      setTimeout(() => {
        songItem.style.transform = ''
      }, 150)
    }

    setTimeout(() => {
      navigate(`/game?mode=${gameMode}&speed=${speed}`)
    }, 200)
  }, [gameMode, speed, navigate])

  const createClickEffect = useCallback((e: React.MouseEvent, element: HTMLElement) => {
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
  }, [])

  const openHelp = useCallback(() => {
    lastFocusedElementRef.current = document.activeElement as HTMLElement
    setShowHelp(true)
  }, [])

  const closeHelp = useCallback(() => {
    setShowHelp(false)
    if (lastFocusedElementRef.current) {
      lastFocusedElementRef.current.focus()
    }
  }, [])

  // PC向けのスケーリング処理
  const [scale, setScale] = useState(1)
  useEffect(() => {
    if (isMobile) {
      setScale(1)
      return
    }

    const handleResize = () => {
      const h = window.innerHeight
      const baseHeight = 900 // デザインの基準となる高さ
      const newScale = h < baseHeight ? h / baseHeight : 1
      setScale(newScale)
    }

    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [isMobile])

  return (
    <div 
      className={`live-venue-bg w-full text-white relative ${isMobile ? 'min-h-screen' : 'h-screen overflow-hidden flex items-center justify-center'}`}
      style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}
    >
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
      <div 
        className={`relative z-10 w-full max-w-[1440px] flex flex-col items-center justify-center mx-auto ${isMobile ? 'py-8 px-6 min-h-screen' : 'h-full'}`}
        style={{ 
          touchAction: 'pan-y',
          ...( !isMobile ? { transform: `scale(${scale})` } : {} )
        }}
      >
        
        {/* タイトルエリア */}
        <div className="w-full mb-16 flex flex-col items-center">
            <div className="cross-logo-container transform scale-105 sm:scale-[1.15]">
            <div className="cross-x"></div>
            <h1 className="cross-logo-text text-5xl sm:text-6xl md:text-7xl leading-tight tracking-tight">
                クロステ
            </h1>
            </div>
            <p className="live-subtitle mt-1 text-sm sm:text-base tracking-[0.3em] text-gray-400 font-medium uppercase">Cross Stage</p>
        </div>

        <div className="w-full flex flex-col md:flex-row gap-16 items-start justify-center">
            {/* 左カラム: モード選択 & Info */}
            <div className="w-full md:w-5/12 flex flex-col gap-8">
                {/* Header Info & Nav */}
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center border-b border-white/10 pb-4">
                        <div className="text-left">
                            <p className="text-[10px] text-gray-500 mt-1">「ストリートライト」 加賀（ネギシャワーP）<br />
                            原曲：piapro（https://piapro.jp/t/ULcJ）｜許諾済</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setShowRanking(true)}
                            className="relative overflow-hidden group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-miku/50 rounded-xl p-4 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-miku/0 via-miku/5 to-miku/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div className="relative flex flex-col items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-miku transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                </svg>
                                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">ランキング</span>
                            </div>
                        </button>

                        <button 
                            onClick={openHelp}
                            className="relative overflow-hidden group bg-white/5 hover:bg-white/10 border border-white/10 hover:border-miku/50 rounded-xl p-4 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-miku/0 via-miku/5 to-miku/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                            <div className="relative flex flex-col items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400 group-hover:text-miku transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">遊び方</span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Mode Selection */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-sm font-bold text-gray-400 tracking-wider mb-2">モード選択</h2>
                    {availableModes.map((mode) => (
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
                                        {mode === 'cursor' ? 'カーソルモード' : mode === 'mobile' ? 'モバイルモード' : mode === 'face' ? 'フェイスモード' : 'ボディモード'}
                                    </h3>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {mode === 'cursor'
                                          ? 'マウスで歌詞をキャッチ！'
                                          : mode === 'mobile'
                                            ? 'タッチで歌詞をキャッチ！画面に合わせて最適化'
                                            : mode === 'face'
                                              ? '口を開けて歌詞をキャッチ！'
                                              : '全身を使って歌詞をキャッチ！'}
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

                    {/* 速度コース選択 */}
                    <div className="bg-white/5 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-1 h-4 bg-miku rounded-full"></span>
                            <p className="text-gray-400 text-xs font-bold">速度コース</p>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {([
                              { value: 8, label: '8秒', desc: '難しい' },
                              { value: 10, label: '10秒', desc: '普通' },
                              { value: 12, label: '12秒', desc: '易しい' },
                            ] as const).map((course) => (
                                <button
                                    key={course.value}
                                    onClick={() => setSpeed(course.value)}
                                    className={`relative p-3 border rounded-lg transition-all duration-300 text-center ${
                                        speed === course.value
                                          ? 'border-miku bg-miku/20 shadow-[0_0_10px_rgba(57,197,187,0.3)]'
                                          : 'border-white/20 hover:border-white/40 bg-white/5'
                                    }`}
                                >
                                    <div className={`text-lg font-bold ${speed === course.value ? 'text-white' : 'text-gray-300'}`}>
                                        {course.label}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">{course.desc}</div>
                                </button>
                            ))}
                        </div>
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

        <div className="w-full mt-12">
          {/* ランキングパネル削除 */}
        </div>
      </div>

      <RankingModal 
        open={showRanking}
        onClose={() => setShowRanking(false)}
        songId={SONG_ID}
        mode={gameMode}
        onModeChange={setGameMode}
      />

      <HelpModal show={showHelp} onClose={closeHelp} isMobile={isMobile} />
    </div>
  )
}

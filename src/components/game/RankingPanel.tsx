import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { PlayMode } from '../../types/game'

type RankingRow = {
  score: number
  max_combo: number
  rank: string
  created_at: string
  player_name?: string
  perfect?: number
  great?: number
  good?: number
  miss?: number
}

type RankingPanelProps = {
  songId: string
  mode?: PlayMode
  period?: 'all' | 'weekly' | 'daily'
  className?: string
}

// キャッシュ用のグローバル Map（コンポーネント外に配置）
const rankingCache = new Map<string, { data: RankingRow[]; timestamp: number }>()
const CACHE_TTL = 30000 // 30秒キャッシュ

const RankingPanel = ({ songId, mode, period = 'all', className = "" }: RankingPanelProps) => {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const queryMode = useMemo(() => mode, [mode])

  const modeLabel = useMemo(() => {
    if (!mode) return '全モード'
    if (mode === 'cursor') return 'マウスモード'
    if (mode === 'mobile') return 'モバイルモード'
    return 'カメラモード'
  }, [mode])

  const cacheKey = useMemo(() => `${songId}-${queryMode ?? 'all'}-${period}`, [songId, queryMode, period])

  const fetchRanking = useCallback(async (signal: AbortSignal) => {
    // キャッシュをチェック
    const cached = rankingCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setRows(cached.data)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ songId })
      if (queryMode) params.append('mode', queryMode)
      if (period && period !== 'all') params.append('period', period)
      
      const res = await fetch(`/api/ranking?${params.toString()}`, { signal })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? res.statusText ?? 'Failed to fetch ranking')
      }
      const payload = (await res.json()) as { ok: boolean; data?: RankingRow[]; error?: string }
      if (!payload.ok) {
        throw new Error(payload.error || 'Failed to fetch ranking')
      }
      const data = payload.data || []

      rankingCache.set(cacheKey, { data, timestamp: Date.now() })
      setRows(data)
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch ranking')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [cacheKey, mode, songId])

  useEffect(() => {
    // 前のリクエストをキャンセル
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    fetchRanking(controller.signal)

    return () => controller.abort()
  }, [fetchRanking])

  return (
    <div className={`w-full rounded-2xl bg-black/40 border border-white/10 p-4 backdrop-blur-md shadow-[0_0_25px_rgba(0,0,0,0.35)] flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-2 flex-none">
        <div>
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-gray-400">ランキング</p>
          <h3 className="text-base sm:text-lg font-bold text-white">Top 10</h3>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-300 text-xs sm:text-sm flex-1 flex items-center justify-center">ローディング中...</div>
      ) : error ? (
        <div className="text-red-300 text-xs sm:text-sm flex-1 flex items-center justify-center">エラー: {error}</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-300 text-xs sm:text-sm flex-1 flex items-center justify-center">まだスコアがありません。</div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <div className="grid grid-cols-[30px,1fr,80px,40px,120px] ranking-grid text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 sticky top-0 bg-black/60 backdrop-blur-md py-1 z-10 rounded-t-lg gap-2 px-2">
            <span>#</span>
            <span>Player</span>
            <span>Score</span>
            <span>Rank</span>
            <span className="text-center ranking-combo-header">Max Combo</span>
          </div>
          <div className="space-y-1">
            {rows.map((row, index) => (
              <div
                key={`${row.score}-${row.created_at}-${index}`}
                className="grid grid-cols-[30px,1fr,80px,40px,120px] ranking-grid items-center text-[11px] sm:text-xs font-mono text-gray-100 bg-white/5 hover:bg-white/10 transition rounded-lg px-2 py-1.5 border border-white/5 gap-2"
              >
                <span className={`font-bold ${index < 3 ? 'text-miku' : 'text-gray-500'}`}>{index + 1}</span>
                <span className="truncate text-white font-semibold">{row.player_name || 'Guest'}</span>
                <span className="tabular-nums text-miku">{row.score.toLocaleString()}</span>
                <span className={`font-bold ${row.rank === 'SS' ? 'text-yellow-400' : row.rank === 'S' ? 'text-yellow-200' : 'text-white'}`}>{row.rank}</span>
                <div className="text-center text-[9px] sm:text-[10px] text-gray-400 tabular-nums ranking-combo">
                  {row.max_combo.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RankingPanel

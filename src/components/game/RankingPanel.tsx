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
  speed?: number
  className?: string
}

// キャッシュ用のグローバル Map（コンポーネント外に配置）
const rankingCache = new Map<string, { data: RankingRow[]; total: number; timestamp: number }>()
const CACHE_TTL = 30000 // 30秒キャッシュ
const PAGE_SIZE = 20

export const clearRankingCache = () => {
  rankingCache.clear()
}

const RankingPanel = ({ songId, mode, period = 'all', speed, className = "" }: RankingPanelProps) => {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const queryMode = useMemo(() => mode, [mode])

  const modeLabel = useMemo(() => {
    if (!mode) return '全モード'
    if (mode === 'cursor') return 'カーソルモード'
    if (mode === 'mobile') return 'モバイルモード'
    if (mode === 'face') return 'フェイスモード'
    return 'ボディモード'
  }, [mode])

  // mode/period/speed が変わったらページを1にリセット
  useEffect(() => {
    setPage(1)
  }, [mode, period, speed])

  const offset = (page - 1) * PAGE_SIZE
  const cacheKey = useMemo(() => `${songId}-${queryMode ?? 'all'}-${period}-${speed ?? 'all'}-${page}`, [songId, queryMode, period, speed, page])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchRanking = useCallback(async (signal: AbortSignal) => {
    // キャッシュをチェック
    const cached = rankingCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setRows(cached.data)
      setTotal(cached.total)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ songId, limit: String(PAGE_SIZE), offset: String(offset) })
      if (queryMode) params.append('mode', queryMode)
      if (speed) params.append('speed', String(speed))
      if (period && period !== 'all') params.append('period', period)

      const res = await fetch(`/api/ranking?${params.toString()}`, { signal })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error?.message ?? res.statusText ?? 'Failed to fetch ranking')
      }
      const payload = (await res.json()) as { data?: RankingRow[]; meta?: { total?: number; count?: number }; error?: { message: string } }

      const data = payload.data || []
      const fetchedTotal = payload.meta?.total ?? 0

      rankingCache.set(cacheKey, { data, total: fetchedTotal, timestamp: Date.now() })
      setRows(data)
      setTotal(fetchedTotal)
    } catch (err) {
      if (signal.aborted) return
      setError(err instanceof Error ? err.message : 'Failed to fetch ranking')
    } finally {
      if (!signal.aborted) setLoading(false)
    }
  }, [cacheKey, mode, speed, songId, offset])

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
          <h3 className="text-base sm:text-lg font-bold text-white">
            {total > 0 ? `${offset + 1}〜${Math.min(offset + PAGE_SIZE, total)}位` : 'ランキング'}
          </h3>
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
          <div className="grid grid-cols-[30px,1fr,auto] md:grid-cols-[30px,1fr,80px,40px,120px] text-[9px] sm:text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 sticky top-0 bg-black/60 backdrop-blur-md py-1 z-10 rounded-t-lg gap-2 px-2">
            <span>#</span>
            <span>Player</span>
            <span className="text-right md:text-left">Score</span>
            <span className="hidden md:block">Rank</span>
            <span className="hidden md:block text-center">Max Combo</span>
          </div>
          <div className="space-y-1">
            {rows.map((row, index) => (
              <div
                key={`${row.score}-${row.created_at}-${index}`}
                className="grid grid-cols-[30px,1fr,auto] md:grid-cols-[30px,1fr,80px,40px,120px] items-center text-[11px] sm:text-xs font-mono text-gray-100 bg-white/5 hover:bg-white/10 transition rounded-lg px-2 py-1.5 border border-white/5 gap-2"
              >
                <span className={`font-bold ${offset + index < 3 ? 'text-miku' : 'text-gray-500'}`}>{offset + index + 1}</span>
                
                <div className="flex flex-col justify-center min-w-0">
                  <span className="truncate text-white font-semibold">{row.player_name || 'Guest'}</span>
                  <div className="flex items-center gap-2 md:hidden text-[9px] text-gray-400 leading-tight mt-0.5">
                    <span>Rank <span className={`${row.rank === 'SS' ? 'text-yellow-400' : row.rank === 'S' ? 'text-yellow-200' : 'text-white'}`}>{row.rank}</span></span>
                    <span>/</span>
                    <span>{row.max_combo.toLocaleString()} Combo</span>
                  </div>
                </div>

                <span className="tabular-nums text-miku text-right md:text-left">{row.score.toLocaleString()}</span>
                
                <span className={`hidden md:block font-bold ${row.rank === 'SS' ? 'text-yellow-400' : row.rank === 'S' ? 'text-yellow-200' : 'text-white'}`}>{row.rank}</span>
                <div className="hidden md:block text-center text-[9px] sm:text-[10px] text-gray-400 tabular-nums">
                  {row.max_combo.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ページネーション */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3 mt-3 flex-none">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            &lt; 前
          </button>
          <span className="text-xs text-gray-300 tabular-nums">
            {page} / {totalPages} ページ
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            次 &gt;
          </button>
        </div>
      )}
    </div>
  )
}

export default RankingPanel

import { useEffect, useMemo, useState } from 'react'
import { PlayMode } from '../../types/game'

type RankingRow = {
  score: number
  max_combo: number
  rank: string
  mode: PlayMode
  created_at: string
}

type RankingPanelProps = {
  songId: string
  mode?: PlayMode
  className?: string
}

const RankingPanel = ({ songId, mode, className = "" }: RankingPanelProps) => {
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const modeLabel = useMemo(() => {
    if (!mode) return '全モード'
    return mode === 'cursor' ? 'マウスモード' : 'カメラモード'
  }, [mode])

  useEffect(() => {
    const controller = new AbortController()
    const fetchRanking = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ songId })
        if (mode) params.append('mode', mode)
        const res = await fetch(`/api/ranking?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          throw new Error(payload?.error ?? 'Failed to fetch ranking')
        }
        const payload = (await res.json()) as { ok: boolean; data?: RankingRow[]; error?: string }
        if (!payload.ok) {
          throw new Error(payload.error || 'Failed to fetch ranking')
        }
        setRows(payload.data || [])
      } catch (err) {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Failed to fetch ranking')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    fetchRanking()
    return () => controller.abort()
  }, [mode, songId])

  return (
    <div className={`w-full rounded-2xl bg-black/40 border border-white/10 p-4 backdrop-blur-md shadow-[0_0_25px_rgba(0,0,0,0.35)] flex flex-col ${className}`}>
      <div className="flex items-center justify-between gap-4 mb-2 flex-none">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-gray-400">ランキング</p>
          <h3 className="text-lg font-bold text-white">Top 10</h3>
        </div>
        <span className="text-[10px] font-semibold text-gray-300 bg-white/5 border border-white/10 rounded-full px-2 py-0.5">
          {modeLabel}
        </span>
      </div>

      {loading ? (
        <div className="text-gray-300 text-sm flex-1">ローディング中...</div>
      ) : error ? (
        <div className="text-red-300 text-sm flex-1">エラー: {error}</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-300 text-sm flex-1">まだスコアがありません。</div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0 scrollbar-hide">
          <div className="grid grid-cols-[40px,1fr,1fr,60px,70px] text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1 sticky top-0 bg-black/60 backdrop-blur-md py-1 z-10 rounded-t-lg">
            <span>#</span>
            <span>Score</span>
            <span>Combo</span>
            <span>Rank</span>
            <span>Mode</span>
          </div>
          <div className="space-y-1">
            {rows.map((row, index) => (
              <div
                key={`${row.mode}-${row.score}-${row.created_at}-${index}`}
                className="grid grid-cols-[40px,1fr,1fr,60px,70px] items-center text-xs font-mono text-gray-100 bg-white/5 hover:bg-white/10 transition rounded-lg px-2 py-1.5 border border-white/5"
              >
                <span className="text-miku font-bold">{index + 1}</span>
                <span className="tabular-nums">{row.score.toLocaleString()}</span>
                <span className="tabular-nums">{row.max_combo.toLocaleString()}</span>
                <span className="font-bold text-white">{row.rank}</span>
                <span className="text-[10px] text-gray-300">{row.mode === 'cursor' ? 'マウス' : 'カメラ'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default RankingPanel

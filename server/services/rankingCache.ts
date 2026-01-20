type CacheKey = string
type RankingCacheEntry = { timestamp: number; data: unknown }

const CACHE_TTL_MS = 30_000
const rankingCache = new Map<CacheKey, RankingCacheEntry>()

const buildCacheKey = (songId: string, mode?: string | null, period?: string | null) => `${songId}:${mode ?? 'all'}:${period ?? 'all'}`

export const getCachedRanking = (songId: string, mode?: string | null, period?: string | null) => {
  const key = buildCacheKey(songId, mode ?? null, period ?? null)
  const entry = rankingCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rankingCache.delete(key)
    return null
  }
  return entry.data
}

export const setCachedRanking = (songId: string, mode: string | null, period: string | null, data: unknown) => {
  rankingCache.set(buildCacheKey(songId, mode, period), {
    timestamp: Date.now(),
    data,
  })
}

export const invalidateRankingCache = (songId: string, mode: string) => {
  const periods = ['all', 'weekly', 'daily']
  // 特定のモードと全モードの両方のキャッシュをクリア
  const modes = [mode, null]

  periods.forEach(p => {
    modes.forEach(m => {
      rankingCache.delete(buildCacheKey(songId, m, p))
    })
  })
}

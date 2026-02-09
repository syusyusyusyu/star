type CacheKey = string
type RankingCacheEntry = { timestamp: number; data: unknown }

const CACHE_TTL_MS = 30_000
const rankingCache = new Map<CacheKey, RankingCacheEntry>()

const buildCacheKey = (songId: string, mode?: string | null, period?: string | null, offset?: number, limit?: number, speed?: number | null) => `${songId}:${mode ?? 'all'}:${period ?? 'all'}:${offset ?? 0}:${limit ?? 20}:${speed ?? 'all'}`

export const getCachedRanking = (songId: string, mode?: string | null, period?: string | null, offset?: number, limit?: number, speed?: number | null) => {
  const key = buildCacheKey(songId, mode ?? null, period ?? null, offset, limit, speed)
  const entry = rankingCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rankingCache.delete(key)
    return null
  }
  return entry.data
}

export const setCachedRanking = (songId: string, mode: string | null, period: string | null, data: unknown, offset?: number, limit?: number, speed?: number | null) => {
  rankingCache.set(buildCacheKey(songId, mode, period, offset, limit, speed), {
    timestamp: Date.now(),
    data,
  })
}

export const invalidateRankingCache = (songId: string, mode: string) => {
  // 特定のモードと全モードの、全offset/limitの組み合わせのキャッシュをクリア
  const prefixes = [
    `${songId}:${mode}:`,
    `${songId}:all:`,
  ]

  for (const key of rankingCache.keys()) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      rankingCache.delete(key)
    }
  }
}

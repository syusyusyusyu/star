import { Hono } from 'hono'
import { supabase } from '../supabaseClient'

type PlayMode = 'cursor' | 'body'

const isPlayMode = (mode: unknown): mode is PlayMode =>
  mode === 'cursor' || mode === 'body'

type CacheKey = string
type RankingCacheEntry = { timestamp: number; data: unknown }

const CACHE_TTL_MS = 30_000
const rankingCache = new Map<CacheKey, RankingCacheEntry>()

const buildCacheKey = (songId: string, mode?: PlayMode | null) => `${songId}:${mode ?? 'all'}`

const getCachedRanking = (songId: string, mode?: PlayMode | null) => {
  const key = buildCacheKey(songId, mode ?? null)
  const entry = rankingCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rankingCache.delete(key)
    return null
  }
  return entry.data
}

const setCachedRanking = (songId: string, mode: PlayMode | null, data: unknown) => {
  rankingCache.set(buildCacheKey(songId, mode), {
    timestamp: Date.now(),
    data,
  })
}

const invalidateRankingCache = (songId: string, mode: PlayMode) => {
  rankingCache.delete(buildCacheKey(songId, null))
  rankingCache.delete(buildCacheKey(songId, mode))
}

export const scoreRoute = new Hono()

scoreRoute.post('/score', async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  const { songId, mode, score, maxCombo, rank } = body as {
    songId?: string
    mode?: unknown
    score?: unknown
    maxCombo?: unknown
    rank?: unknown
  }

  if (!songId || !mode || score === undefined || maxCombo === undefined || !rank) {
    return c.json({ ok: false, error: 'songId, mode, score, maxCombo and rank are required' }, 400)
  }

  if (!isPlayMode(mode)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  if (typeof score !== 'number' || Number.isNaN(score) || typeof maxCombo !== 'number' || Number.isNaN(maxCombo)) {
    return c.json({ ok: false, error: 'score and maxCombo must be numbers' }, 400)
  }

  const { error } = await supabase.from('scores').insert({
    song_id: songId,
    mode,
    score,
    max_combo: maxCombo,
    rank: String(rank),
  })

  if (error) {
    console.error('[score] insert error', error)
    return c.json({ ok: false, error: 'Failed to save score' }, 500)
  }

  invalidateRankingCache(songId, mode)

  return c.json({ ok: true })
})

scoreRoute.get('/ranking', async (c) => {
  const songId = c.req.query('songId')
  const modeParam = c.req.query('mode')

  if (!songId) {
    return c.json({ ok: false, error: 'songId is required' }, 400)
  }

  if (modeParam && !isPlayMode(modeParam)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  const cached = getCachedRanking(songId, modeParam as PlayMode | null)
  if (cached) {
    return c.json({ ok: true, data: cached, cached: true })
  }

  let query = supabase
    .from('scores')
    .select('score,max_combo,rank,mode,created_at')
    .eq('song_id', songId)
    .order('score', { ascending: false })
    .limit(10)

  if (modeParam) {
    query = query.eq('mode', modeParam)
  }

  const { data, error } = await query

  if (error) {
    console.error('[score] ranking error', error)
    return c.json({ ok: false, error: 'Failed to fetch ranking' }, 500)
  }

  setCachedRanking(songId, (modeParam as PlayMode | null) ?? null, data)

  return c.json({ ok: true, data, cached: false })
})

export default scoreRoute

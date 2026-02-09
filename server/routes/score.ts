import { Hono } from 'hono'
import { checkRateLimit } from '../services/rateLimiter'
import { getCachedRanking, invalidateRankingCache, setCachedRanking } from '../services/rankingCache'
import {
  isPlayMode,
  isValidCombo,
  isValidRank,
  isValidScore,
  isValidSongId,
  MAX_COMBO,
  MAX_SCORE,
  MIN_SCORE,
  VALID_RANKS,
} from '../services/scoreValidation'
import { fetchRanking, insertScore } from '../services/scoreService'
import type { PlayMode } from '../services/scoreValidation'

export const scoreRoute = new Hono()

scoreRoute.post('/score', async (c) => {
  // Rate limit check
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({ error: { message: 'Too many requests. Please try again later.' } }, 429)
  }

  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ error: { message: 'Invalid JSON' } }, 400)
  }

  const { songId, mode, score, maxCombo, rank, playerName } = body as {
    songId?: unknown
    mode?: unknown
    score?: unknown
    maxCombo?: unknown
    rank?: unknown
    playerName?: unknown
  }

  // Required fields
  if (songId === undefined || mode === undefined || score === undefined || maxCombo === undefined || rank === undefined) {
    return c.json({ error: { message: 'songId, mode, score, maxCombo and rank are required' } }, 400)
  }

  if (!isValidSongId(songId)) {
    return c.json({ error: { message: 'Invalid songId format' } }, 400)
  }

  if (!isPlayMode(mode)) {
    return c.json({ error: { message: 'mode must be cursor, body, mobile, hand or face' } }, 400)
  }

  if (typeof score !== 'number' || !isValidScore(score)) {
    return c.json({ error: { message: `score must be a number between ${MIN_SCORE} and ${MAX_SCORE}` } }, 400)
  }

  if (typeof maxCombo !== 'number' || !isValidCombo(maxCombo)) {
    return c.json({ error: { message: `maxCombo must be an integer between 0 and ${MAX_COMBO}` } }, 400)
  }

  if (!isValidRank(rank)) {
    return c.json({ error: { message: `rank must be one of: ${VALID_RANKS.join(', ')}` } }, 400)
  }

  const pName = typeof playerName === 'string' ? playerName.slice(0, 20) : 'ゲスト'

  const { error } = await insertScore({
    songId,
    mode,
    score,
    maxCombo,
    rank,
    playerName: pName,
  })

  if (error) {
    console.error('[score] insert error', error)
    return c.json({ error: { message: 'Failed to save score' } }, 500)
  }

  invalidateRankingCache(songId, mode)

  return c.json({ data: { success: true } })
})

scoreRoute.get('/ranking', async (c) => {
  // Rate limit check
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({ error: { message: 'Too many requests. Please try again later.' } }, 429)
  }

  const songId = c.req.query('songId')
  const modeParam = c.req.query('mode')
  const period = c.req.query('period')
  const limitParam = Math.min(50, Math.max(1, parseInt(c.req.query('limit') || '20', 10) || 20))
  const offsetParam = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0)

  if (!songId) {
    return c.json({ error: { message: 'songId is required' } }, 400)
  }

  if (!isValidSongId(songId)) {
    return c.json({ error: { message: 'Invalid songId format' } }, 400)
  }

  if (modeParam && !isPlayMode(modeParam)) {
    return c.json({ error: { message: 'mode must be cursor, body, mobile, hand or face' } }, 400)
  }

  if (period && !['weekly', 'daily', 'all'].includes(period)) {
    return c.json({ error: { message: 'Invalid period' } }, 400)
  }

  const cached = getCachedRanking(songId, modeParam as PlayMode | null, period ?? null, offsetParam, limitParam)
  if (cached) {
    return c.json(cached)
  }

  const { data, error, count } = await fetchRanking({
    songId,
    mode: (modeParam as PlayMode | null) ?? null,
    period: period ?? null,
    limit: limitParam,
    offset: offsetParam,
  })

  if (error) {
    console.error('[score] ranking error', error)
    return c.json({ error: { message: 'Failed to fetch ranking' } }, 500)
  }

  const response = { data, meta: { total: count ?? 0, count: data?.length ?? 0, cached: false } }
  setCachedRanking(songId, (modeParam as PlayMode | null) ?? null, period ?? null, response, offsetParam, limitParam)

  return c.json(response)
})

export default scoreRoute
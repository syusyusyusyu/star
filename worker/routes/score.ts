import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getSupabase } from '../supabaseClient'
import { Env } from '../types'

const app = new Hono<Env>()

// Schema Definitions
const scoreSchema = z.object({
  playerName: z.string().min(1).max(20).transform(val => val.replace(/[\x00-\x1F\x7F]/g, '')), // Basic sanitization
  songId: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  mode: z.enum(['cursor', 'body']).default('cursor'),
  score: z.number().int().min(0),
  maxCombo: z.number().int().min(0),
  rank: z.string().min(1).max(5),
  accuracy: z.number().min(0).max(100).optional(),
})

const querySchema = z.object({
  songId: z.string().min(1),
  mode: z.enum(['cursor', 'body']).optional().default('cursor'),
  limit: z.string().transform(v => parseInt(v)).pipe(z.number().min(1).max(50)).default('20'),
})

// POST /api/v1/scores
app.post('/', zValidator('json', scoreSchema), async (c) => {
  const body = c.req.valid('json')
  const sessionId = c.get('sessionId')
  const requestId = c.get('requestId')

  // Origin Check
  const origin = c.req.header('Origin') || c.req.header('Referer')
  const allowedOrigin = c.env.FRONTEND_ORIGIN
  // Allow localhost for dev
  const isLocalhost = origin?.includes('localhost') || origin?.includes('127.0.0.1')
  
  if (allowedOrigin && !isLocalhost) {
     if (origin && !origin.includes(allowedOrigin)) {
         return c.json({ error: { code: 'FORBIDDEN', message: 'Invalid Origin' }, meta: { requestId } }, 403)
     }
  }

  // Cheat Detection
  let isSuspicious = false
  if (body.score > 1000000) isSuspicious = true
  
  const supabase = getSupabase(c.env)

  const { data, error } = await supabase
    .from('scores')
    .insert({
      session_id: sessionId,
      song_id: body.songId,
      mode: body.mode,
      score: body.score,
      max_combo: body.maxCombo,
      rank: body.rank,
      accuracy: body.accuracy,
      player_name: body.playerName,
      is_suspicious: isSuspicious
    })
    .select('id, score, rank, player_name, created_at')
    .single()

  if (error) {
    console.error('Supabase insert error:', error)
    return c.json({
      error: { code: 'DB_ERROR', message: 'Failed to save score' },
      meta: { requestId }
    }, 500)
  }

  // Log success
  console.log(JSON.stringify({
    level: 'info',
    message: 'Score created',
    requestId,
    songId: body.songId,
    score: body.score,
    isSuspicious
  }))

  return c.json({
    data,
    meta: { requestId }
  })
})

// GET /api/v1/scores
app.get('/', zValidator('query', querySchema), async (c) => {
  const { songId, mode, limit } = c.req.valid('query')
  const requestId = c.get('requestId')
  const supabase = getSupabase(c.env)

  const { data, error, count } = await supabase
    .from('scores')
    .select('player_name, score, rank, mode, created_at, accuracy', { count: 'exact' })
    .eq('song_id', songId)
    .eq('mode', mode)
    .eq('is_suspicious', false)
    .order('score', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Supabase select error:', error)
    return c.json({
      error: { code: 'DB_ERROR', message: 'Failed to fetch scores' },
      meta: { requestId }
    }, 500)
  }

  const mappedData = data?.map(d => ({
    playerName: d.player_name,
    score: d.score,
    rank: d.rank,
    mode: d.mode,
    accuracy: d.accuracy,
    createdAt: d.created_at
  }))

  return c.json({
    data: mappedData,
    meta: {
      count: mappedData?.length,
      total: count,
      requestId
    }
  })
})

export default app

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }
  
  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }
  
  entry.count++
  return true
}

// キャッシュ
type CacheKey = string
type RankingCacheEntry = { timestamp: number; data: unknown }

const CACHE_TTL_MS = 30_000
const rankingCache = new Map<CacheKey, RankingCacheEntry>()

const buildCacheKey = (songId: string, mode?: PlayMode | null, period?: string | null) => `${songId}:${mode ?? 'all'}:${period ?? 'all'}`

const getCachedRanking = (songId: string, mode?: PlayMode | null, period?: string | null) => {
  const key = buildCacheKey(songId, mode ?? null, period ?? null)
  const entry = rankingCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    rankingCache.delete(key)
    return null
  }
  return entry.data
}

const setCachedRanking = (songId: string, mode: PlayMode | null, period: string | null, data: unknown) => {
  rankingCache.set(buildCacheKey(songId, mode, period), {
    timestamp: Date.now(),
    data,
  })
}

const invalidateRankingCache = (songId: string, mode: PlayMode) => {
  const periods = ['all', 'weekly', 'daily']
  // 特定のモードと全モードの両方のキャッシュをクリア
  const modes = [mode, null] 

  periods.forEach(p => {
    modes.forEach(m => {
      rankingCache.delete(buildCacheKey(songId, m, p))
    })
  })
}

// Bindings型を定義
type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

export const scoreRoute = new Hono<{ Bindings: Bindings }>()

scoreRoute.post('/score', async (c) => {
  // セキュリティ: レート制限チェック
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({ ok: false, error: 'Too many requests. Please try again later.' }, 429)
  }

  const body = await c.req.json().catch(() => null)
  if (!body) {
    return c.json({ ok: false, error: 'Invalid JSON' }, 400)
  }

  const { songId, mode, score, maxCombo, rank, playerName } = body as {
    songId?: unknown
    mode?: unknown
    score?: unknown
    maxCombo?: unknown
    rank?: unknown
    playerName?: unknown
  }

  // セキュリティ: 必須フィールドチェック
  if (songId === undefined || mode === undefined || score === undefined || maxCombo === undefined || rank === undefined) {
    return c.json({ ok: false, error: 'songId, mode, score, maxCombo and rank are required' }, 400)
  }

  // セキュリティ: songId 形式検証（SQLインジェクション対策）
  if (!isValidSongId(songId)) {
    return c.json({ ok: false, error: 'Invalid songId format' }, 400)
  }

  // セキュリティ: mode 検証
  if (!isPlayMode(mode)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  // セキュリティ: score 型と範囲検証
  if (typeof score !== 'number' || !isValidScore(score)) {
    return c.json({ ok: false, error: `score must be a number between ${MIN_SCORE} and ${MAX_SCORE}` }, 400)
  }

  // セキュリティ: maxCombo 型と範囲検証
  if (typeof maxCombo !== 'number' || !isValidCombo(maxCombo)) {
    return c.json({ ok: false, error: `maxCombo must be an integer between 0 and ${MAX_COMBO}` }, 400)
  }

  // セキュリティ: rank 検証
  if (!isValidRank(rank)) {
    return c.json({ ok: false, error: `rank must be one of: ${VALID_RANKS.join(', ')}` }, 400)
  }

  // セキュリティ: プレイヤー名検証
  const pName = typeof playerName === 'string' ? playerName.slice(0, 20) : 'ゲスト'

  // Supabase クライアントを環境変数から取得
  const supabase = getSupabase(c.env)

  // Supabase に挿入（パラメータ化クエリで SQL インジェクション対策済み）
  const { error } = await supabase.from('scores').insert({
    song_id: songId,
    mode,
    score: Math.round(score), // 小数点以下を丸める
    max_combo: maxCombo,
    rank: rank.toUpperCase(),
    player_name: pName,
  })

  if (error) {
    console.error('[score] insert error', error)
    return c.json({ ok: false, error: 'Failed to save score' }, 500)
  }

  invalidateRankingCache(songId, mode)

  return c.json({ ok: true })
})

scoreRoute.get('/ranking', async (c) => {
  // セキュリティ: レート制限チェック
  const clientIp = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({ ok: false, error: 'Too many requests. Please try again later.' }, 429)
  }

  const songId = c.req.query('songId')
  const modeParam = c.req.query('mode')
  const period = c.req.query('period')

  if (!songId) {
    return c.json({ ok: false, error: 'songId is required' }, 400)
  }

  // セキュリティ: songId 形式検証（SQLインジェクション対策）
  if (!isValidSongId(songId)) {
    return c.json({ ok: false, error: 'Invalid songId format' }, 400)
  }

  if (modeParam && !isPlayMode(modeParam)) {
    return c.json({ ok: false, error: 'mode must be cursor or body' }, 400)
  }

  if (period && !['weekly', 'daily', 'all'].includes(period)) {
    return c.json({ ok: false, error: 'Invalid period' }, 400)
  }

  const cached = getCachedRanking(songId, modeParam as PlayMode | null, period ?? null)
  if (cached) {
    return c.json({ ok: true, data: cached, cached: true })
  }

  // Supabase クライアントを環境変数から取得
  const supabase = getSupabase(c.env)

  let query = supabase
    .from('scores')
    .select('score,max_combo,rank,created_at,player_name')
    .eq('song_id', songId)
    .order('score', { ascending: false })
    .limit(10)

  if (modeParam) {
    query = query.eq('mode', modeParam)
  }

  if (period === 'weekly') {
    const date = new Date()
    date.setDate(date.getDate() - 7)
    query = query.gt('created_at', date.toISOString())
  } else if (period === 'daily') {
    const date = new Date()
    date.setDate(date.getDate() - 1)
    query = query.gt('created_at', date.toISOString())
  }

  const { data, error } = await query

  if (error) {
    console.error('[score] ranking error', error)
    return c.json({ ok: false, error: 'Failed to fetch ranking' }, 500)
  }

  setCachedRanking(songId, (modeParam as PlayMode | null) ?? null, period ?? null, data)

  return c.json({ ok: true, data, cached: false })
})

export default scoreRoute

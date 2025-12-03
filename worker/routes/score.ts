import { Hono } from 'hono'
import { getSupabase, Env } from '../supabaseClient'

type PlayMode = 'cursor' | 'body'

// ─────────────────────────────────────────────
// セキュリティ: 入力検証ヘルパー
// ─────────────────────────────────────────────
const isPlayMode = (mode: unknown): mode is PlayMode =>
  mode === 'cursor' || mode === 'body'

/** スコアの許容範囲（0〜1,000,000 点） */
const MIN_SCORE = 0
const MAX_SCORE = 1_000_000

/** コンボの許容範囲（0〜10,000） */
const MAX_COMBO = 10_000

/** ランクの許容値 */
const VALID_RANKS = ['SS', 'S', 'A', 'B', 'C', 'D', 'F']

/** songId の形式（英数字とハイフン、最大64文字） */
const SONG_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/

const isValidScore = (score: number): boolean =>
  Number.isFinite(score) && score >= MIN_SCORE && score <= MAX_SCORE

const isValidCombo = (combo: number): boolean =>
  Number.isInteger(combo) && combo >= 0 && combo <= MAX_COMBO

const isValidRank = (rank: unknown): rank is string =>
  typeof rank === 'string' && VALID_RANKS.includes(rank.toUpperCase())

const isValidSongId = (songId: unknown): songId is string =>
  typeof songId === 'string' && SONG_ID_PATTERN.test(songId)

// ─────────────────────────────────────────────
// セキュリティ: レート制限（Cloudflare Workers用）
// 注意: Workers環境では複数インスタンスで実行されるため、
// 本格的なレート制限にはKVやDurable Objectsを使用すべき
// ─────────────────────────────────────────────
type RateLimitEntry = { count: number; resetAt: number }
const rateLimitMap = new Map<string, RateLimitEntry>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1分間
const RATE_LIMIT_MAX_REQUESTS = 30  // 1分間に30リクエストまで

const checkRateLimit = (ip: string): boolean => {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  
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

  const { songId, mode, score, maxCombo, rank } = body as {
    songId?: unknown
    mode?: unknown
    score?: unknown
    maxCombo?: unknown
    rank?: unknown
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

  // Supabase クライアントを環境変数から取得
  const supabase = getSupabase(c.env)

  // Supabase に挿入（パラメータ化クエリで SQL インジェクション対策済み）
  const { error } = await supabase.from('scores').insert({
    song_id: songId,
    mode,
    score: Math.round(score), // 小数点以下を丸める
    max_combo: maxCombo,
    rank: rank.toUpperCase(),
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

  const cached = getCachedRanking(songId, modeParam as PlayMode | null)
  if (cached) {
    return c.json({ ok: true, data: cached, cached: true })
  }

  // Supabase クライアントを環境変数から取得
  const supabase = getSupabase(c.env)

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

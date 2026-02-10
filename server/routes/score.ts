import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { scoreSchema, querySchema } from '../schemas/scoreSchemas'
import { checkRateLimit } from '../services/rateLimiter'
import { invalidateRankingCache } from '../services/rankingCache'
import { submitScore, fetchRanking } from '../services/scoreService'
import type { Env } from '../types'

const app = new Hono<Env>()

// POST /api/score
app.post('/score', zValidator('json', scoreSchema), async (c) => {
  // Rate limit check
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({
      error: { code: 'RATE_LIMIT', message: 'Too many requests' },
      meta: { requestId: c.get('requestId') }
    }, 429)
  }

  const body = c.req.valid('json')
  const response = await submitScore(c, body)

  // キャッシュ無効化（成功時）
  if (response.status === 200) {
    invalidateRankingCache(body.songId, body.mode)
  }

  return response
})

// GET /api/ranking
app.get('/ranking', zValidator('query', querySchema), async (c) => {
  // Rate limit check
  const clientIp = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!checkRateLimit(clientIp)) {
    return c.json({
      error: { code: 'RATE_LIMIT', message: 'Too many requests' },
      meta: { requestId: c.get('requestId') }
    }, 429)
  }

  const query = c.req.valid('query')
  return fetchRanking(c, query)
})

export default app

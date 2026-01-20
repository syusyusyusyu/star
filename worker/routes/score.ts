import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { scoreSchema, querySchema } from '../schemas/scoreSchemas'
import { fetchRanking, submitScore } from '../services/scoreService'
import { Env } from '../types'

const app = new Hono<Env>()

// POST /api/score
app.post('/score', zValidator('json', scoreSchema), async (c) => {
  const body = c.req.valid('json')
  return submitScore(c, body)
})

// GET /api/ranking
app.get('/ranking', zValidator('query', querySchema), async (c) => {
  const query = c.req.valid('query')
  return fetchRanking(c, query)
})

export default app
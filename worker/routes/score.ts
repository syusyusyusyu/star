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
  mode: z.enum(['cursor', 'body', 'mobile', 'hand']).default('cursor'),
  score: z.number().int().min(0),
  maxCombo: z.number().int().min(0),
  rank: z.string().min(1).max(5),
  accuracy: z.number().min(0).max(100).optional(),
})

const querySchema = z.object({
  songId: z.string().min(1),
  mode: z.enum(['cursor', 'body', 'mobile', 'hand']).optional(),
  period: z.enum(['all', 'weekly', 'daily']).optional().default('all'),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// POST /api/score
app.post('/score', zValidator('json', scoreSchema), async (c) => {
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

// GET /api/ranking
app.get('/ranking', zValidator('query', querySchema), async (c) => {
  const { songId, mode, period, limit } = c.req.valid('query')
  const requestId = c.get('requestId')
  const supabase = getSupabase(c.env)

  let query = supabase
    .from('scores')
    .select('player_name, score, rank, mode, created_at, accuracy', { count: 'exact' })
    .eq('song_id', songId)
    .eq('is_suspicious', false)
    .order('score', { ascending: false })
    .limit(limit)

  if (mode) {
    query = query.eq('mode', mode)
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

  const { data, error, count } = await query

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

// POST /api/score
app.post('/score', zValidator('json', scoreSchema), async (c) => {
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

// GET /api/ranking
app.get('/ranking', zValidator('query', querySchema), async (c) => {
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

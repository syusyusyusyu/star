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
  turnstileToken: z.string().optional(),
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

  // Rate Limiting (IP based)
  const ip = c.req.header('CF-Connecting-IP') || 'unknown'
  const rateLimiterId = c.env.RATE_LIMITER.idFromName('global')
  const rateLimiter = c.env.RATE_LIMITER.get(rateLimiterId)
  
  const limitRes = await rateLimiter.fetch(`http://do/limit?key=${ip}&limit=10&window=60`)
  if (limitRes.status === 429) {
    return c.json({ error: { code: 'RATE_LIMIT', message: 'Too many requests' }, meta: { requestId } }, 429)
  }

  // Token Verification (HMAC & Nonce)
  const token = c.req.header('x-score-token')
  if (c.env.SCORE_SIGNING_SECRET && token) {
    const [nonce, timestamp, signature] = token.split('.')
    if (!nonce || !timestamp || !signature) {
       return c.json({ error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }, meta: { requestId } }, 403)
    }

    // Check expiration (5 minutes)
    if (Date.now() - parseInt(timestamp) > 5 * 60 * 1000) {
       return c.json({ error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }, meta: { requestId } }, 403)
    }

    // Verify Signature
    const secret = c.env.SCORE_SIGNING_SECRET
    const data = `${nonce}:${timestamp}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const expectedSignature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(data)
    )
    const expectedHex = Array.from(new Uint8Array(expectedSignature)).map(b => b.toString(16).padStart(2, '0')).join('')
    
    if (signature !== expectedHex) {
       return c.json({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid token signature' }, meta: { requestId } }, 403)
    }

    // Check Nonce (Durable Object)
    const nonceRes = await rateLimiter.fetch(`http://do/nonce?val=${nonce}`)
    if (nonceRes.status !== 200) {
       return c.json({ error: { code: 'NONCE_USED', message: 'Token already used' }, meta: { requestId } }, 409)
    }
  } else if (c.env.SCORE_SIGNING_SECRET) {
      // If secret is configured but token is missing, reject
      return c.json({ error: { code: 'MISSING_TOKEN', message: 'Score token required' }, meta: { requestId } }, 401)
  }

  // Turnstile Verification
  if (c.env.TURNSTILE_SECRET_KEY && body.turnstileToken) {
    const formData = new FormData();
    formData.append('secret', c.env.TURNSTILE_SECRET_KEY);
    formData.append('response', body.turnstileToken);
    formData.append('remoteip', c.req.header('CF-Connecting-IP') || '');

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      body: formData,
      method: 'POST',
    });

    const outcome = await result.json() as any;
    if (!outcome.success) {
      return c.json({ error: { code: 'INVALID_TOKEN', message: 'Turnstile verification failed' }, meta: { requestId } }, 403);
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
    .select('player_name, score, rank, mode, created_at, accuracy, max_combo', { count: 'exact' })
    .eq('song_id', songId)
    .eq('is_suspicious', false)

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

  // Apply ordering and limit after filters
  query = query
    .order('score', { ascending: false })
    .limit(limit)

  const { data, error, count } = await query

  if (error) {
    console.error('Supabase select error:', error)
    return c.json({
      error: { code: 'DB_ERROR', message: 'Failed to fetch scores' },
      meta: { requestId }
    }, 500)
  }

  const mappedData = data?.map(d => ({
    player_name: d.player_name,
    score: d.score,
    rank: d.rank,
    mode: d.mode,
    accuracy: d.accuracy,
    created_at: d.created_at,
    max_combo: d.max_combo
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

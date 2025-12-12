// Cloudflare Workers用 Honoサーバー
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { cors } from 'hono/cors'
import { requestId } from './middleware/requestId'
import { session } from './middleware/session'
import { Env } from './types'
import scoreRoute from './routes/score'
import adminRoute from './routes/admin'
export { RateLimiter } from './rateLimiter'

const app = new Hono<Env>()

// Global Middlewares
app.use('*', poweredBy())
app.use('*', requestId())
app.use('*', session())

// Security Headers
app.use('*', async (c, next) => {
  await next()
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.shields.io; connect-src 'self' https://api.songle.jp https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;")
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=*, microphone=(), geolocation=(), payment=()')
})

// Custom Logger (JSON format)
app.use('*', async (c, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(JSON.stringify({
    level: 'info',
    time: new Date().toISOString(),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration: `${ms}ms`,
    requestId: c.get('requestId'),
    sessionId: c.get('sessionId'),
  }))
})

app.use('*', cors())

// Error Handling
app.onError((err, c) => {
  console.error(JSON.stringify({
    level: 'error',
    message: err.message,
    stack: err.stack,
    requestId: c.get('requestId')
  }))
  return c.json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred'
    },
    meta: {
      requestId: c.get('requestId')
    }
  }, 500)
})

// Health check
app.get('/api/health', (c) => c.json({
  data: { status: 'ok' },
  meta: { requestId: c.get('requestId') }
}))

// Config
app.get('/api/config', (c) => c.json({
  data: { turnstileSiteKey: c.env.TURNSTILE_SITE_KEY },
  meta: { requestId: c.get('requestId') }
}))

// Token generation (HMAC)
app.get('/api/token', async (c) => {
  const secret = c.env.SCORE_SIGNING_SECRET
  if (!secret) {
    return c.json({ error: { code: 'CONFIG_ERROR', message: 'Signing secret not configured' } }, 500)
  }
  
  const nonce = crypto.randomUUID()
  const timestamp = Date.now()
  const data = `${nonce}:${timestamp}`
  
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  )
  
  // ArrayBuffer to Hex string
  const hashArray = Array.from(new Uint8Array(signature))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  const token = `${nonce}.${timestamp}.${hashHex}`
  
  return c.json({
    data: { token },
    meta: { requestId: c.get('requestId') }
  })
})

// Routes
app.route('/api', scoreRoute)
app.route('/admin', adminRoute)

export default app


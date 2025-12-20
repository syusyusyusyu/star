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
  // HSTS: 2 years, include subdomains, preload
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  
  // CSP: Restrict sources significantly
  // Note: 'unsafe-eval' is required for some libraries (like MediaPipe/TensorFlow.js)
  // 'unsafe-inline' is kept for compatibility but should be removed if possible with nonces
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net https://api.songle.jp; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https://img.shields.io; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.songle.jp https://challenges.cloudflare.com https://api.textalive.jp https://songle.jp https://unpkg.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;")
  
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions Policy: Restrict sensitive features
  c.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(self), accelerometer=(), gyroscope=(), magnetometer=()')
  
  // Isolation Policies
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  // COEP might break external resources (images/scripts) without CORP headers, so we use 'credentialless' or omit if too breaking.
  // For now, we omit COEP to avoid breaking external image loading (like Songle or Shields.io) unless we are sure they support it.
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

app.use('*', cors({
  origin: (origin) => {
    // Allow localhost for development and production domains
    // In a real SC-compliant environment, this should be a strict whitelist
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev')) {
      return origin
    }
    return undefined
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-score-token'],
  credentials: true,
}))

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

// Static Assets & SPA Fallback
app.get('*', async (c) => {
  const env = c.env
  if (env.ASSETS) {
    const url = new URL(c.req.url)
    // Try fetching the exact file
    let response = await env.ASSETS.fetch(c.req.raw)
    
    // If 404 and not an API route, serve index.html (SPA fallback)
    if (response.status === 404 && !url.pathname.startsWith('/api')) {
      const indexUrl = new URL('/index.html', c.req.url)
      response = await env.ASSETS.fetch(new Request(indexUrl, c.req.raw))
    }
    return response
  }
  return c.text('Not Found', 404)
})

export default app


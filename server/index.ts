// Minimal Hono server to serve static files and expose simple APIs
import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import scoreRoute from './routes/score'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

// Content Security Policy and related headers for client-side hardening
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' https://unpkg.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.tailwindcss.com",
  "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://textalive.jp https://piapro.jp https://unpkg.com https://cdn.jsdelivr.net https://*.supabase.co",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  'upgrade-insecure-requests',
].join('; ')

app.use('*', async (c, next) => {
  await next()
  c.header('Content-Security-Policy', contentSecurityPolicy)
  c.header(
    'Permissions-Policy',
    'camera=(self), microphone=(), geolocation=(), fullscreen=(self), autoplay=(self)'
  )
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('X-Frame-Options', 'SAMEORIGIN')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
})

// Middlewares
app.use('*', poweredBy())
app.use('*', logger())
app.use('*', cors())

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Config (align with Workers shape)
app.get('/api/config', (c) => {
  return c.json({ data: { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? null } })
})

// Token generation (HMAC, align with Workers)
app.get('/api/token', (c) => {
  const secret = process.env.SCORE_SIGNING_SECRET
  if (!secret) {
    return c.json({ error: { code: 'CONFIG_ERROR', message: 'Signing secret not configured' } }, 500)
  }

  const nonce = crypto.randomUUID()
  const timestamp = Date.now()
  const data = `${nonce}:${timestamp}`
  const signature = crypto.createHmac('sha256', secret).update(data).digest('hex')
  const token = `${nonce}.${timestamp}.${signature}`
  return c.json({ data: { token } })
})

// Example API: echo
app.post('/api/echo', async (c) => {
  const data = await c.req.json().catch(() => ({}))
  return c.json({ ok: true, received: data })
})

app.route('/api', scoreRoute)

// Serve from ./docs if exists, otherwise from project root
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const staticRoot = (() => {
  const docsPath = path.resolve(__dirname, '..', 'docs')
  try {
    // statSync throws if not exists
    if (existsSync(docsPath)) return docsPath
  } catch {}
  return path.resolve(__dirname, '..')
})()

app.use('/*', serveStatic({ root: staticRoot }))

// SPA fallback for client-side routing
app.get('*', async (c) => {
  try {
    const indexHtml = await readFile(path.join(staticRoot, 'index.html'), 'utf-8')
    return c.html(indexHtml)
  } catch (e) {
    return c.text('Not Found', 404)
  }
})

const port = Number(process.env.PORT) || 3000
const hostname = process.env.HOST || '0.0.0.0' // Dockerコンテナでも動作するように
console.log(`[server] Starting Hono on http://${hostname}:${port}`)
serve({ 
  fetch: app.fetch, 
  port,
  hostname
})

// Node.js Hono server with security features aligned with Workers
import 'dotenv/config'
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { poweredBy } from 'hono/powered-by'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import crypto from 'node:crypto'
import { requestId } from './middleware/requestId'
import { session } from './middleware/session'
import scoreRoute from './routes/score'
import adminRoute from './routes/admin'
import type { Env } from './types'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono<Env>()

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

// Global Middlewares
app.use('*', poweredBy())
app.use('*', requestId())
app.use('*', session())

// Security Headers
app.use('*', async (c, next) => {
  await next()
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload')
  c.header('Content-Security-Policy', contentSecurityPolicy)
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  c.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=(self), accelerometer=(), gyroscope=(), magnetometer=()')
  c.header('Cross-Origin-Opener-Policy', 'same-origin')
  c.header('Cross-Origin-Resource-Policy', 'same-origin')
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

// CORS (aligned with Workers)
app.use('*', cors({
  origin: (origin) => {
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
  data: { turnstileSiteKey: process.env.TURNSTILE_SITE_KEY ?? null },
  meta: { requestId: c.get('requestId') }
}))

// Token generation (HMAC)
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
  return c.json({
    data: { token },
    meta: { requestId: c.get('requestId') }
  })
})

// Routes
app.route('/api', scoreRoute)
app.route('/admin', adminRoute)

// Serve from ./docs if exists, otherwise from project root
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const staticRoot = (() => {
  const docsPath = path.resolve(__dirname, '..', 'docs')
  try {
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
const hostname = process.env.HOST || '0.0.0.0'
console.log(`[server] Starting Hono on http://${hostname}:${port}`)
serve({
  fetch: app.fetch,
  port,
  hostname
})

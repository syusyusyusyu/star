// Cloudflare Workers用 Honoサーバー
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import scoreRoute from './routes/score'

type Bindings = {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

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

// Example API: echo
app.post('/api/echo', async (c) => {
  const data = await c.req.json().catch(() => ({}))
  return c.json({ ok: true, received: data })
})

// Score API routes
app.route('/api', scoreRoute)

// 静的ファイルはwrangler.jsoncの assets設定で配信される
// Workersでは静的アセットは別途 assets ディレクトリで配信

export default app

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

// APIルートにのみセキュリティヘッダーを適用
// 静的ファイルはCloudflare Pagesのassetsで配信され、_headersファイルで設定
app.use('/api/*', async (c, next) => {
  await next()
  // Content Security Policy for API responses
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('X-Frame-Options', 'DENY')
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

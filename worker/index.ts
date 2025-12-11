// Cloudflare Workers用 Honoサーバー
import { Hono } from 'hono'
import { poweredBy } from 'hono/powered-by'
import { cors } from 'hono/cors'
import { requestId } from './middleware/requestId'
import { session } from './middleware/session'
import { Env } from './types'
import scoreRoute from './routes/score'
import adminRoute from './routes/admin'

const app = new Hono<Env>()

// Global Middlewares
app.use('*', poweredBy())
app.use('*', requestId())
app.use('*', session())

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
      message: 'An unexpected error occurred'
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

// Routes
app.route('/api', scoreRoute)
app.route('/admin', adminRoute)

export default app


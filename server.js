// Minimal Hono server to serve static files and expose simple APIs
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

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

// Root redirect to index.html first
app.get('/', (c) => c.redirect('/index.html'))

// Serve from ./docs if exists, otherwise from project root
const staticRoot = (() => {
  const docsPath = path.join(__dirname, 'docs')
  try {
    // statSync throws if not exists
    if (require('node:fs').existsSync(docsPath)) return docsPath
  } catch {}
  return __dirname
})()

app.use('/*', serveStatic({ root: staticRoot }))

const port = Number(process.env.PORT) || 3000
console.log(`[server] Starting Hono on http://localhost:${port}`)
serve({ fetch: app.fetch, port })

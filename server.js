// Minimal Hono server to serve static files and expose simple APIs
import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { poweredBy } from 'hono/powered-by'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

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

// 静的ファイルの提供 - docsフォルダ（ビルド出力）
const staticRoot = (() => {
  const docsPath = path.join(__dirname, 'docs')
  
  // docsフォルダが存在する場合（優先）
  if (fs.existsSync(docsPath)) {
    console.log('[server] Serving from docs folder')
    return docsPath
  }
  
  // フォールバック: プロジェクトルート（開発時）
  console.log('[server] Serving from project root')
  return __dirname
})()

// 静的ファイルの配信
app.use('/*', serveStatic({ root: staticRoot }))

// SPAのフォールバック - すべてのルートでindex.htmlを返す
app.get('*', (c) => {
  const indexPath = path.join(staticRoot, 'index.html')
  if (fs.existsSync(indexPath)) {
    return c.html(fs.readFileSync(indexPath, 'utf-8'))
  }
  return c.text('Not Found', 404)
})

const port = Number(process.env.PORT) || 3000
console.log(`[server] Starting Hono on http://localhost:${port}`)
console.log(`[server] Static root: ${staticRoot}`)
serve({ fetch: app.fetch, port })
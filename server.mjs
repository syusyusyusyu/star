import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = new Hono()

// Determine static base directory
function resolveBaseDir() {
  // Highest priority: STATIC_DIR env (relative to project root)
  if (process.env.STATIC_DIR) {
    const p = path.resolve(__dirname, process.env.STATIC_DIR)
    if (fs.existsSync(p)) return p
  }
  // Production: prefer docs if exists
  if (process.env.NODE_ENV === 'production') {
    const p = path.join(__dirname, 'docs')
    if (fs.existsSync(p)) return p
  }
  // Default: project root
  return __dirname
}

const BASE_DIR = resolveBaseDir()
console.log(`[hono] static base: ${BASE_DIR}`)

// index.html at root
app.get('/', async (c) => {
  const filePath = path.join(BASE_DIR, 'index.html')
  try {
    const data = await fs.promises.readFile(filePath)
    return new Response(data, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  } catch {
    return c.text('index.html not found', 404)
  }
})
// Simple health check and API example
app.get('/api/health', (c) => c.json({ ok: true }))

// Content-Type helper
const contentTypeByExt = (ext) => {
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8'
    case '.css': return 'text/css; charset=utf-8'
    case '.js': return 'text/javascript; charset=utf-8'
    case '.mjs': return 'text/javascript; charset=utf-8'
    case '.json': return 'application/json; charset=utf-8'
    case '.svg': return 'image/svg+xml'
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    case '.ico': return 'image/x-icon'
    case '.wasm': return 'application/wasm'
    case '.mp3': return 'audio/mpeg'
    case '.wav': return 'audio/wav'
    case '.txt': return 'text/plain; charset=utf-8'
    case '.md': return 'text/markdown; charset=utf-8'
    default: return 'application/octet-stream'
  }
}

// Catch-all static file server for files under BASE_DIR
app.get('*', async (c) => {
  const reqPath = c.req.path
  // Skip if it's an API path
  if (reqPath.startsWith('/api/')) return c.notFound()

  const rel = decodeURIComponent(reqPath.replace(/^\/+/, ''))
  const resolved = path.resolve(BASE_DIR, rel)
  // Directory traversal protection
  if (!resolved.startsWith(BASE_DIR)) return c.text('Forbidden', 403)

  try {
    const stat = await fs.promises.stat(resolved)
    if (stat.isDirectory()) {
      // Try to serve index.html inside directory
      const idx = path.join(resolved, 'index.html')
      const html = await fs.promises.readFile(idx)
      return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    }
    const data = await fs.promises.readFile(resolved)
    const ct = contentTypeByExt(path.extname(resolved).toLowerCase())
    return new Response(data, { headers: { 'Content-Type': ct } })
  } catch {
    return c.notFound()
  }
})

const port = Number(process.env.PORT) || 3000
console.log(`[hono] listening on http://localhost:${port}`)
serve({ fetch: app.fetch, port })

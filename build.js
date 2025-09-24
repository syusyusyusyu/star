// Build script: copy static files into ./docs for GitHub Pages or hosting
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'

const projectRoot = path.dirname(new URL(import.meta.url).pathname)
const outDir = path.join(projectRoot, 'docs')

// Files to include in build
const staticFiles = [
  'index.html',
  'index-styles.css',
  'index-scripts.js',
  'game.html',
  'styles.css',
  'script.js',
  'game-loader.js'
]

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true })
}

async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest))
  await fsp.copyFile(src, dest)
}

async function main() {
  console.log(`[build] Output -> ${outDir}`)
  await ensureDir(outDir)

  // Clean output dir (only known files)
  for (const file of await fsp.readdir(outDir).catch(() => [])) {
    const p = path.join(outDir, file)
    await fsp.rm(p, { recursive: true, force: true })
  }

  // Copy static files
  for (const file of staticFiles) {
    const src = path.join(projectRoot, file)
    if (!fs.existsSync(src)) {
      console.warn(`[build] skip (not found): ${file}`)
      continue
    }
    const dest = path.join(outDir, file)
    await copyFile(src, dest)
    console.log(`[build] copied: ${file}`)
  }

  // Optional: add a simple 404.html for static hosting
  const notFound = path.join(outDir, '404.html')
  if (!fs.existsSync(notFound)) {
    await fsp.writeFile(
      notFound,
      '<!doctype html><meta charset="utf-8"><title>404</title><p>Not Found</p>'
    )
  }

  console.log('[build] done')
}

main().catch((err) => {
  console.error('[build] failed', err)
  process.exit(1)
})

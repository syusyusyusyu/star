import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUT_DIR = path.join(__dirname, 'docs')
const EXCLUDE_DIRS = new Set(['node_modules', 'docs', '.git', '.vscode'])
const EXCLUDE_FILES = new Set(['server.mjs', 'build.mjs', 'package.json', 'package-lock.json', '.gitignore'])

function shouldExclude(absPath) {
  const rel = path.relative(__dirname, absPath)
  if (!rel || rel.startsWith('..')) return true
  const parts = rel.split(path.sep)
  if (EXCLUDE_DIRS.has(parts[0])) return true
  if (parts.length === 1 && EXCLUDE_FILES.has(parts[0])) return true
  return false
}

async function emptyDir(dir) {
  await fsp.rm(dir, { recursive: true, force: true })
  await fsp.mkdir(dir, { recursive: true })
}

async function copyRecursive(src, dest) {
  const stat = await fsp.stat(src)
  if (stat.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true })
    const entries = await fsp.readdir(src, { withFileTypes: true })
    for (const entry of entries) {
      const s = path.join(src, entry.name)
      if (shouldExclude(s)) continue
      const d = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        await copyRecursive(s, d)
      } else if (entry.isFile()) {
        await fsp.copyFile(s, d)
      }
    }
  } else if (stat.isFile()) {
    await fsp.copyFile(src, dest)
  }
}

async function main() {
  console.log('[build] start -> docs')
  await emptyDir(OUT_DIR)
  // Copy each top-level entry individually (avoid copying root into its subdir)
  const top = await fsp.readdir(__dirname, { withFileTypes: true })
  for (const entry of top) {
    const srcPath = path.join(__dirname, entry.name)
    if (shouldExclude(srcPath)) continue
    const destPath = path.join(OUT_DIR, entry.name)
    await copyRecursive(srcPath, destPath)
  }
  // GitHub Pages friendly
  await fsp.writeFile(path.join(OUT_DIR, '.nojekyll'), '')
  console.log('[build] done')
}

main().catch((e) => {
  console.error('[build] failed', e)
  process.exit(1)
})

/**
 * Build na Vercel: grava BOOKING_API_BASE em public/config.js
 * Defina a variável no painel Vercel (Settings → Environment Variables).
 */
import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const configPath = join(__dirname, '..', 'public', 'config.js')
const base = (process.env.BOOKING_API_BASE || '').replace(/\/$/, '')

if (!base) {
  console.log('[vercel-inject] BOOKING_API_BASE nao definido — mantendo public/config.js do repo')
  process.exit(0)
}

const vercelOrigin = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : ''

const content = `/** Injetado no deploy Vercel (${new Date().toISOString()}) */
window.__API_BASE__ = ${JSON.stringify(base)}
window.__VERCEL_ORIGIN__ = ${JSON.stringify(vercelOrigin)}
`

writeFileSync(configPath, content, 'utf8')
console.log('[vercel-inject] API_BASE =', base)

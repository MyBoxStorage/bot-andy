import 'dotenv/config'
import { existsSync, rmSync } from 'fs'
import { services, products } from './src/config.mjs'
import { initDb } from './src/db.mjs'
import { log, error as logError } from './src/logger.mjs'
import { createExpressApp, startHttpServer, startWhatsApp } from './src/whatsapp.mjs'
import { initReminders } from './src/reminders.mjs'

const RECONNECT_DELAY_MS = 15_000
const SESSION = process.env.WPP_SESSION || 'andy-prod'

// Remove lock files do Chromium que ficam presos entre deploys
function limparLockChromium() {
  const locks = [
    `/app/tokens/${SESSION}/SingletonLock`,
    `/app/tokens/${SESSION}/SingletonCookie`,
    `/app/tokens/${SESSION}/SingletonSocket`,
  ]
  for (const f of locks) {
    if (existsSync(f)) {
      rmSync(f, { force: true })
      log(`🔓 Lock removido: ${f}`)
    }
  }
}

async function connectWhatsApp() {
  while (true) {
    try {
      limparLockChromium()
      await startWhatsApp()
      log('WhatsApp conectado com sucesso.')
      return
    } catch (err) {
      logError('Erro ao conectar WhatsApp (vai tentar novamente):', err.message)
      log(`Aguardando ${RECONNECT_DELAY_MS / 1000}s antes de reconectar...`)
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS))
    }
  }
}

async function main() {
  initDb({ services, products })
  const app = createExpressApp()
  startHttpServer()
  initReminders()
  await connectWhatsApp()
}

main()

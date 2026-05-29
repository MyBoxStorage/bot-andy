import 'dotenv/config'
import { services, products } from './src/config.mjs'
import { initDb } from './src/db.mjs'
import { log, error as logError } from './src/logger.mjs'
import { createExpressApp, startHttpServer, startWhatsApp } from './src/whatsapp.mjs'
import { initReminders } from './src/reminders.mjs'

const RECONNECT_DELAY_MS = 15_000 // 15s entre tentativas

async function connectWhatsApp() {
  while (true) {
    try {
      await startWhatsApp()
      log('WhatsApp conectado com sucesso.')
      return // sai do loop quando conectar
    } catch (err) {
      logError('Erro ao conectar WhatsApp (vai tentar novamente):', err.message)
      log(`Aguardando ${RECONNECT_DELAY_MS / 1000}s antes de reconectar...`)
      await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS))
    }
  }
}

async function main() {
  // Passa dados de config para seed síncrono (evita import circular no db.mjs)
  initDb({ services, products })
  const app = createExpressApp()
  startHttpServer()

  // Inicia lembretes independente do WhatsApp estar conectado
  initReminders()

  // Conecta WhatsApp em loop — nunca mata o processo por timeout de QR
  await connectWhatsApp()
}

main()

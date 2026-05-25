import 'dotenv/config'
import { services, products } from './src/config.mjs'
import { initDb } from './src/db.mjs'
import { log, error as logError } from './src/logger.mjs'
import { createExpressApp, startHttpServer, startWhatsApp } from './src/whatsapp.mjs'
import { initReminders } from './src/reminders.mjs'

async function main() {
  // Passa dados de config para seed síncrono (evita import circular no db.mjs)
  initDb({ services, products })
  createExpressApp()
  startHttpServer()

  try {
    await startWhatsApp()

  // Inicia sistema de lembretes automáticos
  initReminders()
  } catch (err) {
    logError('Erro ao conectar WhatsApp:', err)
    process.exit(1)
  }
}

main()

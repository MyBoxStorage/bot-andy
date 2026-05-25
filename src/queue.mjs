import { enfileirarMensagem, getMensagensParaEnviar, marcarMensagemEnviada, marcarMensagemFalha, getMensagensFalhasNotificar, getConfig } from './db.mjs'
import { log, error as logError } from './logger.mjs'

let sendFunction = null

export function registerSender(fn) { sendFunction = fn }

export async function processarFilaProativa() {
  if (!sendFunction) { logError('queue: sendFunction não registrada'); return }

  const pendentes = getMensagensParaEnviar()
  for (const msg of pendentes) {
    try {
      const ok = await sendFunction(msg.whatsapp_number, msg.conteudo)
      if (ok) {
        marcarMensagemEnviada(msg.id)
        log(`✅ Msg ${msg.id} enviada pra ${msg.whatsapp_number}`)
      } else {
        const delays = [5, 30]
        const delay = delays[msg.tentativas] || 30
        marcarMensagemFalha(msg.id, 'send retornou false', delay)
      }
    } catch (err) {
      const delays = [5, 30]
      const delay = delays[msg.tentativas] || 30
      marcarMensagemFalha(msg.id, err.message, delay)
    }
  }

  const falhas = getMensagensFalhasNotificar()
  if (falhas.length) {
    const andyPhone = getConfig('andy_phone')
    if (andyPhone && sendFunction) {
      for (const f of falhas) {
        await sendFunction(andyPhone, `⚠️ Falha ao enviar msg crítica pra ${f.whatsapp_number}: ${f.ultimo_erro}. Verificar manualmente.`)
        marcarMensagemEnviada(f.id)
      }
    }
  }
}

export { enfileirarMensagem }

import wppconnect from '@wppconnect-team/wppconnect'
import express    from 'express'
import OpenAI     from 'openai'
import fs         from 'fs'
import path       from 'path'
import { SESSION, PORT, staff } from './config.mjs'
import { askClaude, getActiveConversationCount } from './claude.mjs'
import {
  upsertCliente, logMensagem, marcarLgpdAceito, getCliente,
  incrementarMensagemAtiva, getMensagensAtivasHoje,
  checarRateLimit, clienteBloqueado, resetLoopCount,
  marcarAguardandoAndy, getConfig, aprovarSinal, getAgendamento,
  enfileirarMensagem, incrementarFotosRecebidas, marcarStickerRespondido,
  getAgendamentoAguardandoFeedback, registrarFeedbackNota,
} from './db.mjs'
import { log, warn, error as logError } from './logger.mjs'
import { detectarRespostaConfirmacao, notificarAndy } from './reminders.mjs'
import { getAgendamentosFuturosCliente, marcarConfirmadoPeloCliente, cancelarAgendamento } from './db.mjs'
import { deleteEvent } from './calendar.mjs'
import { panelRouter, SECRET, registrarRotasPublicasPainel } from './panel.mjs'
import { bookingRouter } from './booking.mjs'
import { registerSender } from './queue.mjs'
import { temDadoSensivel, sanitizarTexto, tentativaInjection } from './security.mjs'
import { M } from './messages.mjs'

let client = null
const app  = express()
app.use(express.json())

const MAX_FOTOS_CONVERSA = 5
const MAX_AUDIO_SEGUNDOS = 120

function staffNameById(id) {
  return staff.find(s => s.id === id)?.name || id
}

function getOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key || key === 'COLE_SUA_CHAVE_OPENAI_AQUI') return null
  return new OpenAI({ apiKey: key })
}

async function transcribeAudio(mediaBuffer, mimeType = 'audio/ogg', durationSec = 0) {
  if (durationSec > MAX_AUDIO_SEGUNDOS) return null
  const openai = getOpenAI()
  if (!openai) return '[áudio recebido — transcrição indisponível]'
  try {
    const ext  = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('mpeg') ? 'mp3' : 'ogg'
    const tmp  = path.join(process.cwd(), `tmp_audio_${Date.now()}.${ext}`)
    fs.writeFileSync(tmp, mediaBuffer)
    const resp = await openai.audio.transcriptions.create({
      file:  fs.createReadStream(tmp),
      model: 'whisper-1',
      language: 'pt',
    })
    fs.unlinkSync(tmp)
    return resp.text || '[áudio sem conteúdo]'
  } catch (err) {
    logError('Whisper erro:', err.message)
    return '[não consegui transcrever o áudio]'
  }
}

async function analyzeImage(mediaBuffer, mimeType = 'image/jpeg') {
  try {
    const base64 = mediaBuffer.toString('base64')
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
            { type: 'text',  text: 'Essa é uma imagem enviada por um cliente de barbearia. Descreva o estilo de cabelo/barba mostrado em 1-2 frases curtas em português, focando no que o cliente provavelmente quer replicar.' },
          ],
        }],
      }),
    })
    const data = await response.json()
    return data.content?.[0]?.text || '[imagem recebida]'
  } catch (err) {
    logError('Vision erro:', err.message)
    return '[imagem recebida — não consegui analisar]'
  }
}

export function getClient() { return client }

export function createExpressApp() {
  app.get('/qr', (req, res) => {
    if (!app._qr) return res.send('<p>Aguarde o QR...</p><script>setTimeout(()=>location.reload(),3000)</script>')
    res.send(`<img src="${app._qr}" style="width:300px"><p>Escaneie com o WhatsApp</p>`)
  })

  app.get('/', (req, res) => {
    res.send(`
      <h1>Andy Na Régua — Chatbot</h1>
      <p>Status: ${client ? '✅ Conectado' : '⏳ Aguardando'}</p>
      <p>Conversas ativas: ${getActiveConversationCount()}</p>
      <a href="/qr">QR Code</a>
    `)
  })


  // CORS — permite que bot-andy.vercel.app acesse a API do servidor local via ngrok
  app.use((req, res, next) => {
    const allowed = ['https://bot-andy.vercel.app', 'http://localhost:21466']
    const origin = req.headers.origin
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin)
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*')
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, ngrok-skip-browser-warning, Authorization')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  app.use(express.urlencoded({ extended: true }))
  app.use(bookingRouter)
  app.use(`/${SECRET}`, panelRouter)
  registrarRotasPublicasPainel(app)

  return app
}

// ── Fila por número (concurrency control) ───────────────────────
// Garante que mensagens do mesmo cliente sejam processadas em ordem, uma de cada vez.
// Sem isso, 2 mensagens rápidas do mesmo número podem rodar em paralelo e o histórico
// é corrompido (uma sobrescreve a outra). Cada número tem sua própria fila, mas números
// diferentes continuam processando em paralelo (escalável).
const filasPorNumero = new Map()

function enfileirarPorNumero(userPhone, tarefa) {
  const filaAtual = filasPorNumero.get(userPhone) || Promise.resolve()
  const novaFila = filaAtual.then(tarefa).catch(err => logError(`Erro na fila de ${userPhone}:`, err))
  filasPorNumero.set(userPhone, novaFila)
  // Limpa a referência quando terminar (evita memory leak)
  novaFila.finally(() => {
    if (filasPorNumero.get(userPhone) === novaFila) filasPorNumero.delete(userPhone)
  })
  return novaFila
}

async function handleIncomingMessage(message) {
  if (message.isGroupMsg)              return
  if (message.from === 'status@broadcast') return
  if (message.fromMe)                  return
  // Serializa por número — evita respostas trocadas em conversas paralelas
  return enfileirarPorNumero(message.from, () => processarMensagem(message))
}

async function processarMensagem(message) {
  const userPhone = message.from
  const tipo      = message.type

  if (clienteBloqueado(userPhone)) return

  const rl = checarRateLimit(userPhone, 20)
  if (!rl.permitido) {
    log(`Rate limit atingido pra ${userPhone}`)
    return
  }

  const andyPhone = getConfig('andy_phone') || process.env.ANDY_PHONE || ''

  let textToProcess = null
  let logTipo       = 'texto'

  if (tipo === 'chat') {
    if (!message.body) return
    textToProcess = message.body

    if (userPhone === andyPhone) {
      const matchOk = textToProcess.match(/^OK\s+(\d+)$/i)
      if (matchOk) {
        const agId = Number(matchOk[1])
        aprovarSinal(agId)
        const ag = getAgendamento(agId)
        if (ag) {
          const horaLabel = new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
          const dataLabel = new Date(ag.data_hora_inicio).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
          enfileirarMensagem(ag.whatsapp_number, M.sinalAprovado({ hora: horaLabel, dataLabel, barbeiro: staffNameById(ag.staff_id), servico: ag.servico_id }), 'critica')
          await client.sendText(andyPhone, `✅ Sinal aprovado pra agendamento #${agId}. Cliente notificado.`)
        }
        return
      }
    }
  } else if (tipo === 'audio' || tipo === 'ptt') {
    log(`🎤 Áudio recebido de ${userPhone}`)
    const durationSec = message.duration || message.seconds || 0
    if (durationSec > MAX_AUDIO_SEGUNDOS) {
      await client.sendText(userPhone, M.audioLongo())
      return
    }
    try {
      const mediaBuffer = await client.decryptFile(message)
      const transcricao = await transcribeAudio(Buffer.from(mediaBuffer), message.mimetype || 'audio/ogg', durationSec)
      if (!transcricao) {
        await client.sendText(userPhone, M.audioLongo())
        return
      }
      textToProcess = `[áudio transcrito]: ${transcricao}`
      logTipo       = 'audio'
    } catch (err) {
      logError('Erro ao processar áudio:', err)
      textToProcess = '[cliente enviou áudio, mas não consegui transcrever]'
    }
  } else if (tipo === 'image') {
    const clienteImg = getCliente(userPhone)
    const fotosCount = clienteImg?.fotos_recebidas_count || 0
    if (fotosCount >= MAX_FOTOS_CONVERSA) {
      log(`Limite de fotos atingido para ${userPhone}`)
      return
    }
    incrementarFotosRecebidas(userPhone)
    log(`🖼️ Imagem recebida de ${userPhone}`)
    try {
      const mediaBuffer = await client.decryptFile(message)
      const descricao   = await analyzeImage(Buffer.from(mediaBuffer), message.mimetype || 'image/jpeg')
      const caption     = message.caption ? ` — Legenda: "${message.caption}"` : ''
      textToProcess = `[cliente enviou foto de referência de corte]: ${descricao}${caption}`
      logTipo       = 'imagem'
    } catch (err) {
      logError('Erro ao processar imagem:', err)
      textToProcess = '[cliente enviou uma foto de referência de corte]'
    }
  } else if (tipo === 'sticker') {
    const clienteSt = getCliente(userPhone)
    if (clienteSt?.sticker_respondido) return
    marcarStickerRespondido(userPhone)
    await client.sendText(userPhone, M.sticker())
    return
  } else {
    return
  }

  if (tipo === 'chat' && message.body) {
    // Só chama Haiku classificador se houver lembrete pendente aguardando resposta — evita custo em toda msg
    const agendamentos = getAgendamentosFuturosCliente(userPhone)
    const pendente = agendamentos.find(a =>
      a.lembrete_2h_enviado_at && !a.confirmado_pelo_cliente_at && a.status === 'confirmado'
    )
    if (pendente) {
      const resposta = await detectarRespostaConfirmacao(message.body, userPhone)
      if (resposta === 'confirmar') {
        marcarConfirmadoPeloCliente(pendente.id)
        resetLoopCount(userPhone)
        await client.sendText(userPhone, M.confirmadoLembrete())
        logMensagem(userPhone, 'saida', 'Confirmação registrada', 'texto')
        return
      } else if (resposta === 'cancelar') {
        cancelarAgendamento(pendente.id, 'cliente')
        if (pendente.google_event_id) {
          await deleteEvent(pendente.staff_id, pendente.google_event_id).catch(() => {})
        }
        await client.sendText(userPhone, M.canceladoCliente())
        logMensagem(userPhone, 'saida', 'Cancelamento pelo cliente registrado', 'texto')
        return
      }
    }
  }

  if (!textToProcess) return

  if (temDadoSensivel(textToProcess)) {
    await client.sendText(userPhone, M.dadoSensivel())
    return
  }

  if (tentativaInjection(textToProcess)) {
    log(`⚠️ Tentativa de injection de ${userPhone}: ${textToProcess.slice(0, 80)}`)
    await notificarAndy(`🚨 Tentativa de manipulação por ${userPhone}: "${textToProcess.slice(0, 100)}"`)
  }

  log(`📩 [${userPhone}] [${logTipo}]: ${textToProcess?.slice(0, 80)}`)

  const clienteExistente = getCliente(userPhone)
  upsertCliente(userPhone)
  if (clienteExistente && !clienteExistente.lgpd_aceito) {
    marcarLgpdAceito(userPhone)
  }

  logMensagem(userPhone, 'entrada', textToProcess, logTipo)

  const textoLimpo = sanitizarTexto(textToProcess)

  // ── Handler: resposta a feedback pós-serviço (nota 0-10) ──────────
  const aguardandoFeedback = getAgendamentoAguardandoFeedback(userPhone)
  if (aguardandoFeedback) {
    const matchNota = textoLimpo.trim().match(/^(\d{1,2})(?:\D|$)/)
    if (matchNota) {
      const nota = Math.min(10, Math.max(0, Number(matchNota[1])))
      registrarFeedbackNota(aguardandoFeedback.id, nota)

      if (nota >= 9) {
        const reviewLink = getConfig('google_review_link') || ''
        const msg = reviewLink
          ? M.feedbackPositivo().replace('[link Google review]', reviewLink)
          : M.feedbackPositivo().replace('[link Google review]', '(link em breve)')
        await client.sendText(userPhone, msg)
        logMensagem(userPhone, 'saida', msg, 'texto')
      } else if (nota <= 6) {
        await client.sendText(userPhone, M.feedbackNegativo())
        logMensagem(userPhone, 'saida', M.feedbackNegativo(), 'texto')
        const cliente = getCliente(userPhone)
        await notificarAndy(`⚠️ Feedback negativo (${nota}/10) de ${cliente?.nome || userPhone} — agendamento #${aguardandoFeedback.id}`)
        marcarAguardandoAndy(userPhone, 'feedback_negativo')
      } else {
        const msg = `Valeu pelo retorno, brother! 👊`
        await client.sendText(userPhone, msg)
        logMensagem(userPhone, 'saida', msg, 'texto')
      }
      return
    }
  }

  try {
    await client.startTyping(userPhone)
    const { text: reply } = await askClaude(textoLimpo, userPhone)
    await client.stopTyping(userPhone)
    await client.sendText(userPhone, reply)
    logMensagem(userPhone, 'saida', reply, 'texto')
    log(`🤖 Resposta: ${reply.slice(0, 80)}`)
  } catch (err) {
    logError('Erro ao processar mensagem:', err)
    const fallback = M.falhaTecnica()
    await client.sendText(userPhone, fallback).catch(() => {})
    logMensagem(userPhone, 'saida', fallback, 'texto')
  }
}

export async function sendProactiveMessage(whatsappNumber, text) {
  enfileirarMensagem(whatsappNumber, text, 'proativa')
  return true
}

export async function startWhatsApp() {
  registerSender(async (numero, texto) => {
    if (!client) return false
    try {
      const limite  = Number(process.env.MAX_DAILY_ACTIVE_MESSAGES || 5)
      const atual   = getMensagensAtivasHoje(numero)
      if (atual >= limite) { warn(`Limite diário atingido para ${numero}`); return false }
      await client.sendText(numero, texto)
      incrementarMensagemAtiva(numero)
      logMensagem(numero, 'saida', texto, 'texto')
      return true
    } catch {
      return false
    }
  })

  return wppconnect.create({
    session:     SESSION,
    catchQR:     (base64Qr, asciiQR) => {
      log(`QR Code gerado — http://localhost:${PORT}/qr`)
      console.log(asciiQR)
      app._qr = base64Qr
    },
    statusFind:  (statusSession) => { log('WPPConnect status:', statusSession) },
    headless:    true,
    logQR:       true,
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  }).then((c) => {
    client = c
    log('WhatsApp conectado — aguardando mensagens')
    client.onMessage(handleIncomingMessage)
    return c
  })
}

export function startHttpServer() {
  app.listen(PORT, () => {
    log(`Servidor HTTP em http://localhost:${PORT}`)
    log(`QR Code: http://localhost:${PORT}/qr`)
  })
  return app
}

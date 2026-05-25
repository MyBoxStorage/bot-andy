// Limpeza preventiva da fila proativa: marca como cancelada todas as mensagens
// pendentes (proativas) que poderiam ser disparadas no proximo restart.
//
// Uso: node scripts/limpar-fila-proativa.mjs
//
// O que faz:
//   - Marca como 'cancelada' toda msg com status='pendente' (proativa)
//   - Mensagens 'critica' tambem sao limpas pra evitar spam ao Andy
//   - Mostra resumo do que foi limpo
//
// Idempotente: rodar 2x nao causa problema.
import { initDb, getDb } from '../src/db.mjs'

initDb()
const db = getDb()

const antes = db.prepare(`
  SELECT id, whatsapp_number, tipo, tentativas, substr(conteudo,1,80) as preview
  FROM mensagens_pendentes WHERE status = 'pendente'
`).all()

if (!antes.length) {
  console.log('Fila ja esta limpa — nenhuma mensagem pendente.')
  process.exit(0)
}

console.log(`\n${antes.length} mensagem(ns) pendente(s) sera(o) cancelada(s):\n`)
for (const m of antes) {
  console.log(`  #${m.id} | ${m.whatsapp_number} | ${m.tipo} | "${m.preview}..."`)
}

const update = db.prepare(`
  UPDATE mensagens_pendentes
  SET status = 'cancelada', ultimo_erro = 'cancelada manualmente via script anti-spam'
  WHERE status = 'pendente'
`)
const r = update.run()

console.log(`\n✅ ${r.changes} mensagem(ns) cancelada(s). Pode reiniciar o bot sem risco de spam.\n`)
process.exit(0)

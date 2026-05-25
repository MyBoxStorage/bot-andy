// Script utilitário: lista agendamentos futuros do banco
// Rodar: node check-agendamentos.mjs
import { initDb, getDb } from './src/db.mjs'

initDb({ services: [], products: [] })

const ags = getDb().prepare(`
  SELECT id, cliente_nome, whatsapp_number, servico_id, data_hora_inicio, status
  FROM agendamentos
  WHERE date(data_hora_inicio) >= date('now')
  ORDER BY data_hora_inicio
`).all()

console.log('\n=== AGENDAMENTOS FUTUROS ===')
if (ags.length === 0) {
  console.log('Nenhum agendamento futuro encontrado.\n')
} else {
  console.table(ags)
  console.log(`Total: ${ags.length} agendamento(s)\n`)
}

process.exit(0)

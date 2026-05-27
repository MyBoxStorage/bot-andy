const Database = require('better-sqlite3')
const path = require('path')

const TZ = 'America/Sao_Paulo'

function nowIsoBRT() {
  const s = new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T')
  return `${s}-03:00`
}

function nowIsoBRTOffsetMinutes(offsetMinutes) {
  const ms = Date.now() + offsetMinutes * 60_000
  const s = new Date(ms).toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T')
  return `${s}-03:00`
}

const dbPath = path.join(__dirname, '..', 'data', 'chatbot.db')
let db
try {
  db = new Database(dbPath, { readonly: true })
} catch (e) {
  console.error('Não foi possível abrir', dbPath, e.message)
  process.exit(1)
}

console.log('=== TESTE DE TIMEZONE ===\n')

const agoraBrt = nowIsoBRT()
console.log('Node UTC:', new Date().toISOString())
console.log('Node BRT:', new Date().toLocaleString('pt-BR', { timeZone: TZ }))
console.log('nowIsoBRT():', agoraBrt)
console.log('SQLite now:', db.prepare("SELECT datetime('now') as t").get().t)
console.log('SQLite now+3h:', db.prepare("SELECT datetime('now', '+3 hours') as t").get().t)
console.log('SQLite now-3h:', db.prepare("SELECT datetime('now', '-3 hours') as t").get().t)
console.log('TZ env:', process.env.TZ || '(não definido)')

const agsFuturos = db.prepare(
  'SELECT id, data_hora_inicio, status FROM agendamentos WHERE data_hora_inicio > ? ORDER BY data_hora_inicio LIMIT 5'
).all(agoraBrt)
console.log('\nAgendamentos futuros (nowIsoBRT):', agsFuturos.length)
agsFuturos.forEach(a => console.log(' ', a.id, a.data_hora_inicio, a.status))

const hoje = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
const agendHoje = db.prepare(
  'SELECT id, data_hora_inicio FROM agendamentos WHERE date(data_hora_inicio) = date(?) LIMIT 3'
).all(hoje)
console.log('\nAgendamentos de hoje (date sem +3h):', agendHoje.length, 'data=', hoje)

const limiteConcluir = nowIsoBRTOffsetMinutes(-60)
const paraAutoConcluir = db.prepare(
  "SELECT id, data_hora_fim FROM agendamentos WHERE status='confirmado' AND data_hora_fim <= ?"
).all(limiteConcluir)
console.log('\nPara auto-concluir (fim <= now-60min BRT):', paraAutoConcluir.length)
paraAutoConcluir.forEach(a => console.log(' ', a.id, a.data_hora_fim))

console.log('\n=== FIM DO TESTE ===')
db.close()

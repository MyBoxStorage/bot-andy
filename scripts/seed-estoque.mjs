// Script: seta estoque padrao de 5 unidades em TODOS os produtos ativos
// que estiverem com estoque = 0.
//
// Uso: node scripts/seed-estoque.mjs
//
// Idempotente: so afeta produtos com estoque = 0. Produtos com estoque ja
// preenchido (>0) sao mantidos como estao.
import { initDb, getDb } from '../src/db.mjs'

initDb()
const db = getDb()

const ESTOQUE_PADRAO = 5

const alvos = db.prepare(`
  SELECT id, nome FROM produtos WHERE estoque = 0 AND ativo = 1 ORDER BY nome
`).all()

if (!alvos.length) {
  console.log('Nenhum produto com estoque = 0. DB ja esta em dia.')
  process.exit(0)
}

const update = db.prepare(`
  UPDATE produtos SET estoque = ?, updated_at = datetime('now') WHERE id = ?
`)

const tx = db.transaction(() => {
  for (const p of alvos) update.run(ESTOQUE_PADRAO, p.id)
})
tx()

console.log(`\n=== Seed de estoque concluido ===`)
console.log(`${alvos.length} produto(s) atualizado(s) para estoque = ${ESTOQUE_PADRAO}\n`)
for (const p of alvos) console.log(`  ${p.id} — ${p.nome}`)

console.log(`\nProximos passos:`)
console.log(`  - Os produtos ja aparecem no painel admin (rota /Estoque)`)
console.log(`  - Ajuste a quantidade real de cada produto pelo painel`)
console.log(`  - O bot agora pode recomendar esses produtos via tool consultar_produtos`)

process.exit(0)

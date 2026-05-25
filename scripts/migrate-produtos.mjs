// Script de migration: atualiza nome/descricao/preco dos 20 produtos no DB
// a partir do array `products` em src/config.mjs.
//
// Uso: node scripts/migrate-produtos.mjs
//
// Idempotente — pode rodar quantas vezes quiser.
// Nao mexe em estoque nem em ativo (gerenciados pelo painel admin).
import { initDb, getDb } from '../src/db.mjs'
import { products } from '../src/config.mjs'

initDb()
const db = getDb()

const update = db.prepare(`
  UPDATE produtos
  SET nome = ?, descricao = ?, preco = ?, updated_at = datetime('now')
  WHERE id = ?
`)

const insert = db.prepare(`
  INSERT INTO produtos (id, nome, descricao, preco, estoque, ativo)
  VALUES (?, ?, ?, ?, 0, 1)
`)

const getOne = db.prepare(`SELECT * FROM produtos WHERE id = ?`)

let atualizados = 0
let inseridos   = 0
let inalterados = 0
const alteracoes = []

const tx = db.transaction(() => {
  for (const p of products) {
    const existente = getOne.get(p.id)
    if (!existente) {
      insert.run(p.id, p.name, p.description, p.price)
      inseridos++
      alteracoes.push(`+ ${p.id} (novo) — R$${p.price.toFixed(2)}`)
      continue
    }
    const mudou =
      existente.nome      !== p.name        ||
      existente.descricao !== p.description ||
      Number(existente.preco) !== Number(p.price)
    if (mudou) {
      const diffs = []
      if (Number(existente.preco) !== Number(p.price)) {
        diffs.push(`R$${Number(existente.preco).toFixed(2)} -> R$${p.price.toFixed(2)}`)
      }
      if (existente.nome !== p.name) diffs.push(`nome`)
      if (existente.descricao !== p.description) diffs.push(`descricao`)
      update.run(p.name, p.description, p.price, p.id)
      atualizados++
      alteracoes.push(`~ ${p.id} — ${diffs.join(', ')}`)
    } else {
      inalterados++
    }
  }
})

tx()

console.log('\n=== Migration de produtos concluida ===')
console.log(`Inseridos:   ${inseridos}`)
console.log(`Atualizados: ${atualizados}`)
console.log(`Inalterados: ${inalterados}`)
console.log(`Total na config: ${products.length}\n`)

if (alteracoes.length) {
  console.log('Detalhes:')
  for (const a of alteracoes) console.log('  ' + a)
} else {
  console.log('Nenhuma alteracao necessaria — DB ja esta em dia.')
}

const estoqueZero = db.prepare(`SELECT COUNT(*) as n FROM produtos WHERE estoque = 0 AND ativo = 1`).get().n
if (estoqueZero > 0) {
  console.log(`\nAVISO: ${estoqueZero} produto(s) com estoque = 0. Atualize no painel admin antes do bot poder recomenda-los.`)
}

process.exit(0)

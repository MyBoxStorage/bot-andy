import 'dotenv/config'
import readline from 'readline'
import { askClaude } from './src/claude.mjs'
import { initDb } from './src/db.mjs'
import { services, products } from './src/config.mjs'

initDb({ services, products })

const numero = '5547999999999@c.us'
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

console.log('━━━ Andy Na Régua DEMO — CTRL+C pra sair ━━━')
console.log('Digite suas mensagens como cliente:\n')

function pergunta() {
  rl.question('👤 Você: ', async (texto) => {
    if (!texto.trim()) return pergunta()
    const r = await askClaude(texto.trim(), numero)
    console.log(`🤖 Bot: ${r.text}\n`)
    pergunta()
  })
}
pergunta()

/**
 * Script manual de migração financeira.
 *
 * Aplica:
 * - Colunas opcionais em agendamentos: concluido_automatico, presenca_confirmada_at,
 *   no_show_marcado_at (via addColumnIfMissing).
 * - Tabelas: barbeiros, comissao_overrides, fechamentos, fechamento_agendamentos,
 *   despesas, sessoes_barbeiro; índices idx_fechamentos_*, idx_despesas_data,
 *   idx_sessoes_*.
 * - Seeds: barbeiro1/barbeiro2/barbeiro3 com senha provisória "mudar123" (hash bcrypt).
 *
 * DDL completo e funções de acesso: src/db.mjs (runFinanceiroMigrations / exports).

import { initDb, getDb } from '../src/db.mjs'

const TABELAS_ESPERADAS = [
  'barbeiros',
  'comissao_overrides',
  'fechamentos',
  'fechamento_agendamentos',
  'despesas',
  'sessoes_barbeiro',
]

initDb({})

for (const nome of TABELAS_ESPERADAS) {
  const row = getDb()
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`)
    .get(nome)
  if (!row) {
    console.error(`[migrate-financeiro] Tabela ausente: ${nome}`)
    process.exit(1)
  }
}

console.log('[migrate-financeiro] Concluído sem erros. Tabelas:', TABELAS_ESPERADAS.join(', '))

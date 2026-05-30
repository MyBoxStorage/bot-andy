# INSTRUÇÕES PARA IMPLEMENTAÇÃO — MÓDULO DE FECHAMENTO DE CAIXA
## Andy Na Régua Barbearia — Cursor AI Agent

---

## CONTEXTO DO PROJETO (leia antes de qualquer coisa)

- Stack: Node.js + Express 4 + better-sqlite3 síncrono + ES Modules (`"type": "module"`)
- Arquivos principais: `src/db.mjs` (banco), `src/panel.mjs` (rotas e HTML)
- Dark theme: `--bg:#000000`, `--surface:#0a0a0a`, `--elevated:#111111`, `--red:#cc1f1f`, `--green:#22c55e`, `--amber:#f59e0b`, `--blue-l:#3b82f6`
- Modais usam `<dialog>` nativo com classes `.finance-dlg`, `.fin-dlg-hd`, `.fin-dlg-bd`, `.fin-dlg-ft`
- Alpine.js disponível via CDN (`x-data`, `x-model`, `@click`, etc.)
- Todas as funções de DB são síncronas (better-sqlite3)
- A recepção usa `receptionRouter` montado em `/${RECEPTION_SECRET}/`
- O kanban da recepção está em `receptionRouter.get('/kanban', ...)`
- **NÃO altere** o módulo de comissões/fechamentos de barbeiro — ele está intacto e funciona

---

## REGRAS ABSOLUTAS

1. **Nunca destruir tabelas existentes** — apenas `ADD COLUMN` ou `CREATE TABLE IF NOT EXISTS`
2. **Nunca alterar** as tabelas: `fechamentos`, `fechamento_agendamentos`, `barbeiros`, `comissao_overrides`, `sessoes_barbeiro`
3. **Nunca remover** funções existentes em `db.mjs` — apenas adicionar novas
4. **Todo código novo** em `db.mjs` vai no final do arquivo, após o bloco de comentário `BARBEIROS, FECHAMENTOS...`
5. **Todo HTML** usa as mesmas variáveis CSS `--bg`, `--surface`, `--elevated`, `--border`, `--red`, `--green` etc.
6. **Importações novas** em `panel.mjs` são adicionadas no bloco `import` existente no topo (linhas 4–23)
7. **Nunca usar `localStorage`** — estado mantido em banco SQLite
8. Formas de pagamento aceitas: `['pix', 'dinheiro', 'debito', 'credito']`
9. O preço do atendimento é **sempre** o preço do serviço cadastrado na tabela `servicos` — não editar no pagamento
10. Pagamento pode ser **misto**: parte em dinheiro + parte em Pix (múltiplas formas por atendimento)

---

## PASSO 1 — MIGRATION SQL (adicionar ao final de `runFinanceiroMigrations()` em `src/db.mjs`)

Localize a função `runFinanceiroMigrations()` em `src/db.mjs`.
Dentro dela, **após o bloco `database.exec(...)` existente**, adicione:

```javascript
// ── Colunas de pagamento nos agendamentos ──────────────────────
// Adiciona forma_pagamento e troco ao agendamento (idempotente)
addColumnIfMissing('agendamentos', 'forma_pagamento', 'TEXT')
// JSON serializado: [{"forma":"pix","valor":30},{"forma":"dinheiro","valor":20}]
addColumnIfMissing('agendamentos', 'pagamento_itens', 'TEXT')
// Valor total recebido em dinheiro (para cálculo de troco)
addColumnIfMissing('agendamentos', 'valor_recebido_dinheiro', 'REAL')
// Troco calculado
addColumnIfMissing('agendamentos', 'troco', 'REAL')
// Timestamp de quando o pagamento foi registrado
addColumnIfMissing('agendamentos', 'pago_em', 'TEXT')

// ── Vendas de produtos avulsas com pagamento ──────────────────
addColumnIfMissing('vendas_produtos', 'forma_pagamento', 'TEXT')
addColumnIfMissing('vendas_produtos', 'pagamento_itens', 'TEXT')
addColumnIfMissing('vendas_utos', 'valor_recebido_dinheiro', 'REAL')
addColumnIfMissing('vendas_produtos', 'troco', 'REAL')
addColumnIfMissing('vendas_produtos', 'pago_em', 'TEXT')

// ── Tabela: caixas_dia ─────────────────────────────────────────
// Um registro por dia. O caixa "abre" automaticamente no primeiro pagamento.
database.exec(`
  CREATE TABLE IF NOT EXISTS caixas_dia (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    data            TEXT NOT NULL UNIQUE,
    fundo_inicial   REAL NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'aberto',
    fechado_em      TEXT,
    fechado_por     TEXT,
    obs             TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_caixas_data ON caixas_dia(data);
  CREATE INDEX IF NOT EXISTS idx_caixas_status ON caixas_dia(status);
`)

// ── Tabela: caixa_pagamentos ───────────────────────────────────
database.exec(`
  CREATE TABLE IF NOT EXISTS caixa_pagamentos (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    caixa_id          INTEGER NOT NULL,
    data              TEXT NOT NULL,
    tipo              TEXT NOT NULL DEFAULT 'servico',
    agendamento_id    INTEGER,
    venda_produto_id  INTEGER,
    staff_id          TEXT NOT NULL,
    descricao         TEXT NOT NULL,
    valor_servico     REAL NOT NULL DEFAULT 0,
    pagamento_itens   TEXT NOT NULL DEFAULT '[]',
    valor_recebido_dinheiro REAL DEFAULT 0,
    troco             REAL DEFAULT 0,
    estornado         INTEGER NOT NULL DEFAULT 0,
    estornado_em      TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (caixa_id) REFERENCES caixas_dia(id)
  );
  CREATE INDEX IF NOT EXISTS idx_caixa_pagamentos_caixa ON caixa_pagamentos(caixa_id);
  CREATE INDEX IF NOT EXISTS idx_caixa_pagamentos_data ON caixa_pagamentos(data);
  CREATE INDEX IF NOT EXISTS idx_caixa_pagamentos_agendamento ON caixa_pagamentos(agendamento_id);
  CREATE INDEX IF NOT EXISTS idx_caixa_pagamentos_staff ON caixa_pagamentos(staff_id);
`)
```

---

## PASSO 2 — FUNÇÕES DE DB (adicionar ao FINAL de `src/db.mjs`)

Após o último export do arquivo (função `marcarNaoCompareceu`), adicione:

```javascript
// ═══════════════════════════════════════════════════════════════
//  MÓDULO DE CAIXA DIÁRIO
// ═══════════════════════════════════════════════════════════════

export function getOuCriarCaixaDia(data) {
  const db = getDb()
  let caixa = db.prepare(`SELECT * FROM caixas_dia WHERE data = ?`).get(data)
  if (!caixa) {
    db.prepare(`INSERT OR IGNORE INTO caixas_dia (data, fundo_inicial, status) VALUES (?, 0, 'aberto')`).run(data)
    caixa = db.prepare(`SELECT * FROM caixas_dia WHERE data = ?`).get(data)
  }
  return caixa
}

export function definirFundoInicial(data, fundoInicial) {
  const db = getDb()
  getOuCriarCaixaDia(data)
  db.prepare(`
    UPDATE caixas_dia SET fundo_inicial = ?, updated_at = datetime('now')
    WHERE data = ?
  `).run(Number(fundoInicial) || 0, data)
  return db.prepare(`SELECT * FROM caixas_dia WHERE data = ?`).get(data)
}

export function registrarPagamentoCaixa({
  data, tipo, agendamento_id, venda_produto_id, staff_id,
  descricao, valor_servico, pagamento_itens,
  valor_recebido_dinheiro, troco,
}) {
  const db = getDb()
  const caixa = getOuCriarCaixaDia(data)
  const pagItensJson = JSON.stringify(pagamento_itens || [])
  const formaSimples = pagamento_itens?.length === 1 ? pagamento_itens[0].forma : 'misto'

  const r = db.prepare(`
    INSERT INTO caixa_pagamentos
      (caixa_id, data, tipo, agendamento_id, venda_produto_id, staff_id, descricao,
       valor_servico, pagamento_itens, valor_recebido_dinheiro, troco)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    caixa.id, data, tipo,
    agendamento_id ?? null, venda_produto_id ?? null,
    staff_id, descricao,
    Number(valor_servico) || 0, pagItensJson,
    Number(valor_recebido_dinheiro) || 0, Number(troco) || 0,
  )

  if (agendamento_id) {
    db.prepare(`
      UPDATE agendamentos
      SET forma_pagamento = ?, pagamento_itens = ?,
          valor_recebido_dinheiro = ?, troco = ?,
          pago_em = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).run(formaSimples, pagItensJson, Number(valor_recebido_dinheiro) || 0, Number(troco) || 0, agendamento_id)
  }

  if (venda_produto_id) {
    db.prepare(`
      UPDATE vendas_produtos
      SET forma_pagamento = ?, pagamento_itens = ?,
          valor_recebido_dinheiro = ?, troco = ?, pago_em = datetime('now')
      WHERE id = ?
    `).run(formaSimples, pagItensJson, Number(valor_recebido_dinheiro) || 0, Number(troco) || 0, venda_produto_id)
  }

  return r.lastInsertRowid
}

export function estornarPagamentoCaixa(caixaPagamentoId) {
  const db = getDb()
  const cp = db.prepare(`SELECT * FROM caixa_pagamentos WHERE id = ?`).get(caixaPagamentoId)
  if (!cp || cp.estornado) return false

  db.prepare(`UPDATE caixa_pagamentos SET estornado = 1, estornado_em = datetime('now') WHERE id = ?`).run(caixaPagamentoId)

  if (cp.agendamento_id) {
    db.prepare(`
      UPDATE agendamentos
      SET forma_pagamento = NULL, pagamento_itens = NULL,
          valor_recebido_dinheiro = NULL, troco = NULL, pago_em = NULL,
          updated_at = datetime('now')
      WHERE id = ?
    `).run(cp.agendamento_id)
  }

  return true
}

export function getResumoCaixaDia(data) {
  const db = getDb()
  const caixa = getOuCriarCaixaDia(data)

  const pagamentos = db.prepare(`
    SELECT cp.*, b.nome AS barbeiro_nome
    FROM caixa_pagamentos cp
    LEFT JOIN barbeiros b ON b.id = cp.staff_id
    WHERE cp.data = ? AND cp.estornado = 0
    ORDER BY cp.created_at ASC
  `).all(data)

  const totaisPorForma = { pix: 0, dinheiro: 0, debito: 0, credito: 0 }
  let totalBruto = 0
  for (const p of pagamentos) {
    totalBruto += Number(p.valor_servico) || 0
    try {
      const itens = JSON.parse(p.pagamento_itens || '[]')
      for (const item of itens) {
        if (totaisPorForma[item.forma] !== undefined) {
          totaisPorForma[item.forma] += Number(item.valor) || 0
        }
      }
    } catch {}
  }

  const porBarbeiro = {}
  for (const p of pagamentos) {
    if (!porBarbeiro[p.staff_id]) {
      porBarbeiro[p.staff_id] = { nome: p.barbeiro_nome || p.staff_id, total: 0, atendimentos: 0, produtos: 0 }
    }
    porBarbeiro[p.staff_id].total += Number(p.valor_servico) || 0
    if (p.tipo === 'servico') porBarbeiro[p.staff_id].atendimentos += 1
    if (p.tipo === 'produto') porBarbeiro[p.staff_id].produtos += 1
  }

  const despesas = db.prepare(`SELECT * FROM despesas WHERE date(data) = date(?) ORDER BY created_at ASC`).all(data)
  const totalDespesas = despesas.reduce((s, d) => s + Number(d.valor), 0)

  const semPagamento = db.prepare(`
    SELECT a.id, a.cliente_nome, a.staff_id, a.servico_id, a.data_hora_inicio,
           s.nome AS servico_nome, s.preco AS servico_preco
    FROM agendamentos a
    LEFT JOIN servicos s ON s.id = a.servico_id
    WHERE date(a.data_hora_inicio) = date(?)
      AND a.status = 'concluido'
      AND (a.pago_em IS NULL OR a.forma_pagamento IS NULL)
    ORDER BY a.data_hora_inicio ASC
  `).all(data)

  return {
    caixa,
    pagamentos,
    totaisPorForma,
    totalBruto,
    totalDespesas,
    saldoLiquido: totalBruto - totalDespesas,
    porBarbeiro: Object.entries(porBarbeiro).map(([id, v]) => ({ staff_id: id, ...v })),
    despesas,
    semPagamento,
    atendimentos: pagamentos.filter(p => p.tipo === 'servico').length,
    vendasProdutos: pagamentos.filter(p => p.tipo === 'produto').length,
  }
}

export function fecharCaixaDia(data, fechadoPor = 'recepcao', obs = null, forcar = false) {
  const db = getDb()
  const resumo = getResumoCaixaDia(data)

  if (!forcar && resumo.semPagamento.length > 0) {
    return {
      erro: `Há ${resumo.semPagamento.length} atendimento(s) concluído(s) sem pagamento registrado.`,
      semPagamento: resumo.semPagamento,
    }
  }

  db.prepare(`
    UPDATE caixas_dia
    SET status = 'fechado', fechado_em = datetime('now'), fechado_por = ?, obs = ?, updated_at = datetime('now')
    WHERE data = ?
  `).run(fechadoPor, obs ?? null, data)

  return { ok: true, resumo }
}

export function reabrirCaixaDia(data) {
  const db = getDb()
  db.prepare(`
    UPDATE caixas_dia
    SET status = 'aberto', fechado_em = NULL, fechado_por = NULL, updated_at = datetime('now')
    WHERE data = ?
  `).run(data)
  return db.prepare(`SELECT * FROM caixas_dia WHERE data = ?`).get(data)
}

export function listarCaixas({ dataInicio, dataFim, status, limit = 30 } = {}) {
  const db = getDb()
  let q = `SELECT * FROM caixas_dia WHERE 1=1`
  const p = []
  if (dataInicio) { q += ` AND date(data) >= date(?)`; p.push(dataInicio) }
  if (dataFim)    { q += ` AND date(data) <= date(?)`; p.push(dataFim) }
  if (status)     { q += ` AND status = ?`; p.push(status) }
  q += ` ORDER BY data DESC LIMIT ?`
  p.push(limit)
  return db.prepare(q).all(...p)
}

export function registrarVendaProdutoAvulsa({ whatsapp_number, produto_id, quantidade, valor_unitario }) {
  const db = getDb()
  db.prepare(`UPDATE produtos SET estoque = MAX(0, estoque - ?), updated_at = datetime('now') WHERE id = ?`)
    .run(Number(quantidade) || 1, produto_id)
  const r = db.prepare(`
    INSERT INTO vendas_produtos (agendamento_id, whatsapp_number, produto_id, quantidade, valor_unitario)
    VALUES (NULL, ?, ?, ?, ?)
  `).run(whatsapp_number || 'avulso', produto_id, Number(quantidade) || 1, Number(valor_unitario))
  return r.lastInsertRowid
}
```

---

## PASSO 3 — ATUALIZAR IMPORTS EM `src/panel.mjs`

Localizar o bloco `import { ... } from './db.mjs'` no topo do arquivo (linhas 4–23).
Adicionar ao final da lista de imports (antes do `}`):

```javascript
  getOuCriarCaixaDia, definirFundoInicial, registrarPagamentoCaixa,
  estornarPagamentoCaixa, getResumoCaixaDia, fecharCaixaDia,
  reabrirCaixaDia, listarCaixas, registrarVendaProdutoAvulsa,
```

> `getProdutosEmEstoque` já está na lista — não duplicar.

---

## PASSO 4 — CONSTANTE AUXILIAR (adicionar em `src/panel.mjs`)

Após a linha `const CATEGORIAS_DESPESA = [...]`, adicionar:

```javascript
const FORMAS_LABEL_SERVER = {
  pix: 'PIX',
  dinheiro: 'Dinheiro',
  debito: 'Cartão Débito',
  credito: 'Cartão Crédito',
}
```

---

## PASSO 5 — MENU DA RECEPÇÃO

Localizar o array `navReception` dentro da função `shell(...)` em `panel.mjs`:

```javascript
const navReception = [
  { id:'kanban',                label:'Kanban',       icon:ic.chart },
  { id:'agenda',                label:'Agenda',       icon:ic.cal },
  { id:'agenda/agendar-manual', label:'Ag. Manual',   icon:ic.plus },
  { id:'despesas',              label:'Despesas',     icon:ic.box },
]
```

**Substituir** por:

```javascript
const navReception = [
  { id:'kanban',                label:'Kanban',       icon:ic.chart },
  { id:'caixa',                 label:'Caixa do Dia', icon:ic.money },
  { id:'agenda',                label:'Agenda',       icon:ic.cal },
  { id:'agenda/agendar-manual', label:'Ag. Manual',   icon:ic.plus },
  { id:'despesas',              label:'Despesas',     icon:ic.box },
]
```

---

## PASSO 6 — MENU DO ADMIN (Financeiro)

Localizar o array `navFinanceiro` dentro da função `shell(...)`:

```javascript
const navFinanceiro = [
  { id:'financeiro',              label:'Financeiro',    icon:ic.money },
  { id:'financeiro/comissoes',    label:'Comissões',     icon:ic.chart },
  { id:'financeiro/fechamentos',  label:'Fechamentos',   icon:ic.check },
  { id:'financeiro/despesas',     label:'Despesas',      icon:ic.box },
]
```

**Substituir** por:

```javascript
const navFinanceiro = [
  { id:'financeiro',              label:'Financeiro',    icon:ic.money },
  { id:'financeiro/caixa-hoje',   label:'Caixa Hoje',    icon:ic.chart },
  { id:'financeiro/comissoes',    label:'Comissões',     icon:ic.chart },
  { id:'financeiro/fechamentos',  label:'Fechamentos',   icon:ic.check },
  { id:'financeiro/despesas',     label:'Despesas',      icon:ic.box },
]
```

---

## PASSO 7 — MODAL DE PAGAMENTO NO KANBAN

### 7.1 — Dados do card para o modal

Em `src/panel.mjs`, localizar a função que gera o HTML de cada card do kanban (dentro do handler `receptionRouter.get('/kanban', ...)`).

Adicionar os seguintes atributos `data-*` na tag raiz de cada card kanban:

```html
data-ag-id="${ag.id}"
data-nome="${escapeHtml(ag.cliente_nome || '')}"
data-servico="${escapeHtml(ag.servico_nome || ag.servico_id || '')}"
data-barbeiro="${escapeHtml(staffNameById(ag.staff_id))}"
data-preco="${ag.servico_preco || 0}"
```

### 7.2 — Injetar dados no script do kanban

Dentro do handler do kanban, antes do HTML, coletar:

```javascript
const produtosEstoque = getProdutosEmEstoque()
const staffOptsKanban = staff.filter(s => s.active)
  .map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
```

No bloco `<script>` do kanban, adicionar:

```javascript
window.__PRODUTOS__ = ${JSON.stringify(produtosEstoque.map(p => ({ id: p.id, nome: p.nome, preco: p.preco })))};
const RECEPTION_SECRET = '${RECEPTION_SECRET}';
```

### 7.3 — Interceptar drop na coluna "concluido"

No JavaScript do kanban, localizar onde o drop é processado e a rota de mover é chamada.

**Quando `destinoCol === 'concluido'` e `origemCol !== 'concluido'`**, substituir a lógica de mover direto por:

```javascript
if (destinoCol === 'concluido' && origemCol !== 'concluido') {
  const agId    = cardEl.dataset.agId
  const nome    = cardEl.dataset.nome    || ''
  const servico = cardEl.dataset.servico || ''
  const barbeiro= cardEl.dataset.barbeiro|| ''
  const valor   = cardEl.dataset.preco   || 0
  openPayModal(agId, nome, servico, barbeiro, valor, cardEl, destinoCol)
  return // aguarda confirmação do modal para mover
}
```

### 7.4 — HTML dos modais (adicionar dentro do HTML do kanban, antes de `</body>`)

#### Modal de Pagamento de Atendimento

```html
<div class="kb-overlay" id="payOverlay">
  <div class="kb-modal" style="width:500px;max-width:95vw">
    <button class="kb-modal-close" onclick="closePayModal()">✕</button>
    <h3 id="payModalTitle">Registrar Pagamento</h3>

    <div id="payResumo" style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:#888">Cliente</span>
        <span id="payClienteNome" style="color:#e2e8f0;font-weight:500"></span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:#888">Serviço</span>
        <span id="payServicoNome" style="color:#e2e8f0"></span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="color:#888">Barbeiro</span>
        <span id="payBarbeiroNome" style="color:#e2e8f0"></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-weight:600;margin-top:6px;padding-top:6px;border-top:1px solid #2a2a2a">
        <span style="color:#888">Valor do serviço</span>
        <span id="payValorServico" style="color:#4ade80;font-size:15px"></span>
      </div>
    </div>

    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">Produtos vendidos (opcional)</div>
      <div id="payProdutosList" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px"></div>
      <button type="button" onclick="adicionarLinhaProduto()"
        style="font-size:11px;color:#60a5fa;background:transparent;border:1px dashed #1e3a5f;padding:5px 12px;border-radius:5px;cursor:pointer;width:100%">
        + Adicionar produto
      </button>
    </div>

    <div style="margin-bottom:14px">
      <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.3px;margin-bottom:6px">
        Formas de pagamento <span style="color:#ef4444">*</span>
      </div>
      <div id="payFormasList" style="display:flex;flex-direction:column;gap:6px"></div>
      <button type="button" onclick="adicionarLinhaForma()"
        style="font-size:11px;color:#60a5fa;background:transparent;border:1px dashed #1e3a5f;padding:5px 12px;border-radius:5px;cursor:pointer;width:100%;margin-top:6px">
        + Dividir pagamento
      </button>
    </div>

    <div id="payTrocoSection" style="display:none;background:#1c1400;border:1px solid #78350f;border-radius:8px;padding:10px;margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;color:#fbbf24">Pagamento em dinheiro</span>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="font-size:11px;color:#888">Recebido:</label>
          <input type="number" id="payValorRecebido" min="0" step="0.01" placeholder="0,00"
            style="width:90px;padding:5px 8px;background:#242424;border:1px solid #555;border-radius:5px;color:#fff;font-size:13px;text-align:right"
            oninput="calcularTroco()">
        </div>
      </div>
      <div style="display:flex;justify-content:space-between">
        <span style="font-size:12px;color:#888">Troco a devolver:</span>
        <span id="payTrocoValor" style="font-size:14px;font-weight:600;color:#fbbf24">R$ 0,00</span>
      </div>
    </div>

    <div style="background:#111;border:1px solid #2a2a2a;border-radius:8px;padding:10px;margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
        <span>Total a pagar</span>
        <span id="payTotalAPagar" style="color:#fff;font-weight:600"></span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888">
        <span>Total informado</span>
        <span id="payTotalInformado" style="font-weight:600"></span>
      </div>
    </div>

    <div id="payError" class="modal-error"></div>
    <div class="kb-modal-footer">
      <button class="btn-red" id="payConfirmBtn" onclick="confirmarPagamento()">Confirmar pagamento</button>
      <button class="btn-ghost" onclick="closePayModal()">Cancelar</button>
    </div>
  </div>
</div>

<!-- Modal Fundo Inicial -->
<div class="kb-overlay" id="fundoOverlay">
  <div class="kb-modal" style="width:380px;max-width:95vw">
    <h3>Abrir Caixa — Fundo Inicial</h3>
    <p style="font-size:13px;color:#888;margin-bottom:16px">
      Informe o valor em dinheiro que está no caixa antes de começar o dia.
      Este valor NÃO entra no faturamento.
    </p>
    <div class="fg">
      <label>Fundo inicial (R$)</label>
      <input type="number" id="fundoValor" min="0" step="0.01" placeholder="70,00"
        style="font-size:16px;text-align:center">
    </div>
    <div class="kb-modal-footer">
      <button class="btn-red" onclick="confirmarFundo()">Confirmar</button>
      <button class="btn-ghost" onclick="closeFundoModal()">Pular</button>
    </div>
  </div>
</div>

<!-- Modal Venda Avulsa de Produto -->
<div class="kb-overlay" id="vendaAvulsaOverlay">
  <div class="kb-modal" style="width:460px;max-width:95vw">
    <button class="kb-modal-close" onclick="closeVendaAvulsa()">✕</button>
    <h3>Venda de Produto</h3>
    <div class="fg">
      <label>Produto</label>
      <select id="vaSelectProduto" onchange="vaAtualizarPreco()">
        <option value="">Selecione...</option>
        <!-- Preenchido via JS com window.__PRODUTOS__ -->
      </select>
    </div>
    <div class="fg">
      <label>Barbeiro responsável</label>
      <select id="vaSelectBarbeiro">
        <!-- Preenchido via template no servidor com staffOptsKanban -->
      </select>
    </div>
    <div class="fg" style="display:flex;gap:8px;align-items:flex-end">
      <div style="flex:1">
        <label>Quantidade</label>
        <input type="number" id="vaQtd" min="1" value="1" oninput="vaAtualizarPreco()">
      </div>
      <div style="flex:1">
        <label>Total</label>
        <input type="text" id="vaTotal" readonly style="background:#111;color:#4ade80;font-weight:600">
      </div>
    </div>

    <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:.3px;margin:12px 0 6px">
      Forma de pagamento
    </div>
    <div id="vaFormasList" style="display:flex;flex-direction:column;gap:6px"></div>
    <button type="button" onclick="vaAdicionarForma()"
      style="font-size:11px;color:#60a5fa;background:transparent;border:1px dashed #1e3a5f;padding:5px 12px;border-radius:5px;cursor:pointer;width:100%;margin-top:6px">
      + Dividir pagamento
    </button>

    <div id="vaTrocoSection" style="display:none;background:#1c1400;border:1px solid #78350f;border-radius:8px;padding:10px;margin-top:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span style="font-size:12px;color:#fbbf24">Recebido em dinheiro:</span>
        <input type="number" id="vaValorRecebido" min="0" step="0.01" placeholder="0,00"
          style="width:90px;padding:5px 8px;background:#242424;border:1px solid #555;border-radius:5px;color:#fff;font-size:13px;text-align:right"
          oninput="vaCalcTroco()">
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:6px">
        <span style="font-size:12px;color:#888">Troco:</span>
        <span id="vaTrocoValor" style="font-weight:600;color:#fbbf24">R$ 0,00</span>
      </div>
    </div>

    <div id="vaError" class="modal-error" style="margin-top:10px"></div>
    <div class="kb-modal-footer" style="margin-top:14px">
      <button class="btn-red" onclick="confirmarVendaAvulsa()">Confirmar venda</button>
      <button class="btn-ghost" onclick="closeVendaAvulsa()">Cancelar</button>
    </div>
  </div>
</div>
```

### 7.5 — JavaScript dos modais (adicionar no `<script>` do kanban)

```javascript
// ── Constantes de formas de pagamento ──────────────────────────
const FORMAS_PAG = ['pix', 'dinheiro', 'debito', 'credito']
const FORMAS_LABEL = { pix: 'PIX', dinheiro: 'Dinheiro', debito: 'Cartão Débito', credito: 'Cartão Crédito' }

// ── Estado do modal de pagamento ──────────────────────────────
let _payAgendamentoId = null
let _payValorServico = 0

function openPayModal(agendamentoId, nome, servico, barbeiro, valor, cardEl, destCol) {
  _payAgendamentoId = agendamentoId
  _payValorServico = Number(valor) || 0

  document.getElementById('payClienteNome').textContent = nome
  document.getElementById('payServicoNome').textContent = servico
  document.getElementById('payBarbeiroNome').textContent = barbeiro
  document.getElementById('payValorServico').textContent = 'R$ ' + _payValorServico.toFixed(2).replace('.', ',')
  document.getElementById('payTotalAPagar').textContent = 'R$ ' + _payValorServico.toFixed(2).replace('.', ',')
  document.getElementById('payError').classList.remove('on')
  document.getElementById('payProdutosList').innerHTML = ''
  document.getElementById('payValorRecebido').value = ''
  document.getElementById('payTrocoSection').style.display = 'none'
  document.getElementById('payTrocoValor').textContent = 'R$ 0,00'

  const formasList = document.getElementById('payFormasList')
  formasList.innerHTML = ''
  adicionarLinhaForma()
  atualizarTotalInformado()
  document.getElementById('payOverlay').classList.add('open')
}

function closePayModal() {
  document.getElementById('payOverlay').classList.remove('open')
  _payAgendamentoId = null
}

function adicionarLinhaForma(formaDefault = 'pix', valorDefault = '') {
  const container = document.getElementById('payFormasList')
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;gap:6px;align-items:center'
  const opts = FORMAS_PAG.map(f => `<option value="${f}"${f===formaDefault?' selected':''}>${FORMAS_LABEL[f]}</option>`).join('')
  div.innerHTML = `
    <select onchange="verificarDinheiro()" style="flex:1;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px">${opts}</select>
    <input type="number" min="0" step="0.01" placeholder="Valor" value="${valorDefault}"
      style="width:110px;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px;text-align:right"
      oninput="atualizarTotalInformado()">
    <button type="button" onclick="this.parentElement.remove();verificarDinheiro();atualizarTotalInformado()"
      style="background:transparent;border:none;color:#555;cursor:pointer;font-size:16px;padding:0 4px">✕</button>`
  container.appendChild(div)
  verificarDinheiro()
}

function adicionarLinhaProduto() {
  const container = document.getElementById('payProdutosList')
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;gap:6px;align-items:center'
  const opts = (window.__PRODUTOS__ || []).map(p =>
    `<option value="${p.id}" data-preco="${p.preco}">${p.nome} — R$ ${Number(p.preco).toFixed(2).replace('.',',')}</option>`
  ).join('')
  div.innerHTML = `
    <select style="flex:1;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px" onchange="atualizarTotalComProdutos()">
      <option value="">Selecione produto...</option>${opts}
    </select>
    <input type="number" min="1" value="1" placeholder="Qtd"
      style="width:60px;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px;text-align:center"
      oninput="atualizarTotalComProdutos()">
    <button type="button" onclick="this.parentElement.remove();atualizarTotalComProdutos()"
      style="background:transparent;border:none;color:#555;cursor:pointer;font-size:16px;padding:0 4px">✕</button>`
  container.appendChild(div)
}

function getValorTotalComProdutos() {
  let total = _payValorServico
  const linhas = document.getElementById('payProdutosList').children
  for (const l of linhas) {
    const sel = l.querySelector('select')
    const qtd = parseInt(l.querySelector('input').value) || 0
    if (sel?.value) {
      const preco = parseFloat(sel.selectedOptions[0]?.dataset?.preco || 0)
      total += preco * qtd
    }
  }
  return total
}

function atualizarTotalComProdutos() {
  const total = getValorTotalComProdutos()
  document.getElementById('payTotalAPagar').textContent = 'R$ ' + total.toFixed(2).replace('.', ',')
  atualizarTotalInformado()
}

function atualizarTotalInformado() {
  const linhas = document.getElementById('payFormasList').children
  let soma = 0
  for (const l of linhas) {
    soma += parseFloat(l.querySelector('input[type=number]')?.value || 0) || 0
  }
  const total = getValorTotalComProdutos()
  const el = document.getElementById('payTotalInformado')
  el.textContent = 'R$ ' + soma.toFixed(2).replace('.', ',')
  el.style.color = Math.abs(soma - total) < 0.01 ? '#4ade80' : '#f87171'
}

function verificarDinheiro() {
  const linhas = document.getElementById('payFormasList').children
  let temDinheiro = false
  for (const l of linhas) {
    if (l.querySelector('select')?.value === 'dinheiro') { temDinheiro = true; break }
  }
  document.getElementById('payTrocoSection').style.display = temDinheiro ? 'block' : 'none'
  if (!temDinheiro) document.getElementById('payTrocoValor').textContent = 'R$ 0,00'
}

function calcularTroco() {
  const recebido = parseFloat(document.getElementById('payValorRecebido').value) || 0
  const linhas = document.getElementById('payFormasList').children
  let parcelaDinheiro = 0
  for (const l of linhas) {
    if (l.querySelector('select')?.value === 'dinheiro') {
      parcelaDinheiro += parseFloat(l.querySelector('input[type=number]')?.value || 0) || 0
    }
  }
  const troco = Math.max(0, recebido - parcelaDinheiro)
  document.getElementById('payTrocoValor').textContent = 'R$ ' + troco.toFixed(2).replace('.', ',')
}

async function confirmarPagamento() {
  const err = document.getElementById('payError')
  err.classList.remove('on')

  const formasLinhas = document.getElementById('payFormasList').children
  const pagamentoItens = []
  for (const l of formasLinhas) {
    const forma = l.querySelector('select')?.value
    const valor = parseFloat(l.querySelector('input[type=number]')?.value || 0) || 0
    if (forma && valor > 0) pagamentoItens.push({ forma, valor })
  }

  if (pagamentoItens.length === 0) {
    err.textContent = 'Informe ao menos uma forma de pagamento com valor.'
    err.classList.add('on'); return
  }

  const totalInformado = pagamentoItens.reduce((s, i) => s + i.valor, 0)
  const totalDevido = getValorTotalComProdutos()
  if (Math.abs(totalInformado - totalDevido) > 0.01) {
    err.textContent = `Total informado (R$ ${totalInformado.toFixed(2).replace('.',',')}) difere do valor a pagar (R$ ${totalDevido.toFixed(2).replace('.',',')}).`
    err.classList.add('on'); return
  }

  const valorRecebidoDinheiro = parseFloat(document.getElementById('payValorRecebido').value) || 0
  const parcelaDinheiro = pagamentoItens.filter(i => i.forma === 'dinheiro').reduce((s, i) => s + i.valor, 0)
  const troco = Math.max(0, valorRecebidoDinheiro - parcelaDinheiro)

  const produtoLinhas = document.getElementById('payProdutosList').children
  const produtosVendidos = []
  for (const l of produtoLinhas) {
    const sel = l.querySelector('select')
    const qtd = parseInt(l.querySelector('input').value) || 0
    if (sel?.value && qtd > 0) {
      const preco = parseFloat(sel.selectedOptions[0]?.dataset?.preco || 0)
      produtosVendidos.push({ produto_id: sel.value, quantidade: qtd, valor_unitario: preco })
    }
  }

  document.getElementById('payConfirmBtn').disabled = true
  try {
    const resp = await fetch(`/${RECEPTION_SECRET}/caixa/pagar-atendimento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agendamento_id: _payAgendamentoId, pagamento_itens: pagamentoItens, valor_recebido_dinheiro: valorRecebidoDinheiro, troco, produtos_vendidos: produtosVendidos }),
    })
    const data = await resp.json()
    if (!resp.ok || data.erro) throw new Error(data.erro || 'Erro ao registrar pagamento')
    closePayModal()
    location.reload()
  } catch (e) {
    err.textContent = e.message
    err.classList.add('on')
  } finally {
    document.getElementById('payConfirmBtn').disabled = false
  }
}

// ── Fundo inicial ──────────────────────────────────────────────
function openFundoModal() {
  document.getElementById('fundoOverlay').classList.add('open')
  setTimeout(() => document.getElementById('fundoValor').focus(), 100)
}
function closeFundoModal() { document.getElementById('fundoOverlay').classList.remove('open') }
async function confirmarFundo() {
  const val = parseFloat(document.getElementById('fundoValor').value) || 0
  await fetch(`/${RECEPTION_SECRET}/caixa/fundo-inicial`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ valor: val }),
  })
  closeFundoModal()
}

// ── Venda avulsa ───────────────────────────────────────────────
function openVendaAvulsa() {
  // Preencher select de produtos
  const sel = document.getElementById('vaSelectProduto')
  sel.innerHTML = '<option value="">Selecione...</option>'
  ;(window.__PRODUTOS__ || []).forEach(p => {
    const o = document.createElement('option')
    o.value = p.id
    o.dataset.preco = p.preco
    o.textContent = `${p.nome} — R$ ${Number(p.preco).toFixed(2).replace('.',',')}`
    sel.appendChild(o)
  })
  document.getElementById('vaFormasList').innerHTML = ''
  vaAdicionarForma()
  document.getElementById('vaError').classList.remove('on')
  document.getElementById('vaQtd').value = 1
  document.getElementById('vaTotal').value = ''
  document.getElementById('vaTrocoSection').style.display = 'none'
  document.getElementById('vaValorRecebido').value = ''
  document.getElementById('vaTrocoValor').textContent = 'R$ 0,00'
  document.getElementById('vendaAvulsaOverlay').classList.add('open')
}
function closeVendaAvulsa() { document.getElementById('vendaAvulsaOverlay').classList.remove('open') }

function vaAdicionarForma(formaDefault = 'pix', valorDefault = '') {
  const container = document.getElementById('vaFormasList')
  const div = document.createElement('div')
  div.style.cssText = 'display:flex;gap:6px;align-items:center'
  const opts = FORMAS_PAG.map(f => `<option value="${f}"${f===formaDefault?' selected':''}>${FORMAS_LABEL[f]}</option>`).join('')
  div.innerHTML = `
    <select onchange="vaVerificarDinheiro()" style="flex:1;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px">${opts}</select>
    <input type="number" min="0" step="0.01" placeholder="Valor" value="${valorDefault}"
      style="width:110px;padding:7px 8px;background:#242424;border:1px solid #333;border-radius:6px;color:#fff;font-size:13px;text-align:right">
    <button type="button" onclick="this.parentElement.remove();vaVerificarDinheiro()"
      style="background:transparent;border:none;color:#555;cursor:pointer;font-size:16px;padding:0 4px">✕</button>`
  container.appendChild(div)
}
function vaAtualizarPreco() {
  const sel = document.getElementById('vaSelectProduto')
  const qtd = parseInt(document.getElementById('vaQtd').value) || 1
  const preco = parseFloat(sel.selectedOptions[0]?.dataset?.preco || 0)
  document.getElementById('vaTotal').value = 'R$ ' + (preco * qtd).toFixed(2).replace('.', ',')
}
function vaVerificarDinheiro() {
  const linhas = document.getElementById('vaFormasList').children
  let tem = false
  for (const l of linhas) if (l.querySelector('select')?.value === 'dinheiro') { tem = true; break }
  document.getElementById('vaTrocoSection').style.display = tem ? 'block' : 'none'
}
function vaCalcTroco() {
  const recebido = parseFloat(document.getElementById('vaValorRecebido').value) || 0
  const linhas = document.getElementById('vaFormasList').children
  let parcelaDinheiro = 0
  for (const l of linhas) {
    if (l.querySelector('select')?.value === 'dinheiro') {
      parcelaDinheiro += parseFloat(l.querySelector('input[type=number]')?.value || 0) || 0
    }
  }
  document.getElementById('vaTrocoValor').textContent = 'R$ ' + Math.max(0, recebido - parcelaDinheiro).toFixed(2).replace('.', ',')
}
async function confirmarVendaAvulsa() {
  const err = document.getElementById('vaError')
  err.classList.remove('on')
  const prodId  = document.getElementById('vaSelectProduto').value
  const staffId = document.getElementById('vaSelectBarbeiro').value
  const qtd     = parseInt(document.getElementById('vaQtd').value) || 0
  if (!prodId)  { err.textContent = 'Selecione um produto.'; err.classList.add('on'); return }
  if (!staffId) { err.textContent = 'Selecione o barbeiro responsável.'; err.classList.add('on'); return }
  if (qtd < 1)  { err.textContent = 'Quantidade inválida.'; err.classList.add('on'); return }

  const linhas = document.getElementById('vaFormasList').children
  const pagamentoItens = []
  for (const l of linhas) {
    const forma = l.querySelector('select')?.value
    const valor = parseFloat(l.querySelector('input[type=number]')?.value || 0) || 0
    if (forma && valor > 0) pagamentoItens.push({ forma, valor })
  }
  if (!pagamentoItens.length) { err.textContent = 'Informe a forma de pagamento.'; err.classList.add('on'); return }

  const recebido = parseFloat(document.getElementById('vaValorRecebido').value) || 0
  const parcelaDinheiro = pagamentoItens.filter(i => i.forma === 'dinheiro').reduce((s, i) => s + i.valor, 0)
  const troco = Math.max(0, recebido - parcelaDinheiro)

  try {
    const resp = await fetch(`/${RECEPTION_SECRET}/caixa/venda-produto-avulsa`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ produto_id: prodId, quantidade: qtd, staff_id: staffId, pagamento_itens: pagamentoItens, valor_recebido_dinheiro: recebido, troco }),
    })
    const data = await resp.json()
    if (!resp.ok || data.erro) throw new Error(data.erro || 'Erro')
    closeVendaAvulsa()
    if (typeof toast === 'function') toast('Venda registrada!', 'success')
  } catch (e) {
    err.textContent = e.message
    err.classList.add('on')
  }
}
```

### 7.6 — Botão de venda avulsa no header do kanban

No HTML do kanban, localizar a `div.kb-header` e adicionar **após os botões existentes**:

```html
<button onclick="openVendaAvulsa()"
  style="font-size:11px;padding:5px 14px;background:#1c1400;border:1px solid #78350f;color:#fbbf24;border-radius:6px;cursor:pointer">
  + Vender Produto
</button>
```

---

## PASSO 8 — ROTAS BACKEND DA RECEPÇÃO (adicionar em `src/panel.mjs`)

Adicionar **após as rotas existentes de despesas** da recepção:

```javascript
// ═══════════════════════════════════════════════════════════════
//  ROTAS DE CAIXA (recepção)
// ═══════════════════════════════════════════════════════════════

receptionRouter.post('/caixa/fundo-inicial', express.json(), (req, res) => {
  const { valor } = req.body || {}
  try {
    definirFundoInicial(hojeStr(), Number(valor) || 0)
    res.json({ ok: true })
  } catch (e) { log('Erro fundo-inicial:', e.message); res.status(500).json({ erro: e.message }) }
})

receptionRouter.post('/caixa/pagar-atendimento', express.json(), (req, res) => {
  const { agendamento_id, pagamento_itens, valor_recebido_dinheiro, troco, produtos_vendidos } = req.body || {}
  if (!agendamento_id || !pagamento_itens?.length) {
    return res.status(400).json({ erro: 'agendamento_id e pagamento_itens são obrigatórios' })
  }
  try {
    const ag = getAgendamento(Number(agendamento_id))
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' })
    const servico = getDb().prepare(`SELECT * FROM servicos WHERE id = ?`).get(ag.servico_id)
    const hoje = hojeStr()
    getOuCriarCaixaDia(hoje)

    registrarPagamentoCaixa({
      data: hoje, tipo: 'servico', agendamento_id: ag.id, venda_produto_id: null,
      staff_id: ag.staff_id,
      descricao: `${servico?.nome || ag.servico_id} — ${ag.cliente_nome || 'Cliente'}`,
      valor_servico: servico?.preco || 0,
      pagamento_itens,
      valor_recebido_dinheiro: Number(valor_recebido_dinheiro) || 0,
      troco: Number(troco) || 0,
    })

    if (Array.isArray(produtos_vendidos) && produtos_vendidos.length > 0) {
      for (const pv of produtos_vendidos) {
        const prod = getDb().prepare(`SELECT * FROM produtos WHERE id = ?`).get(pv.produto_id)
        if (!prod) continue
        const vendaId = registrarVendaProdutoAvulsa({
          whatsapp_number: ag.whatsapp_number,
          produto_id: pv.produto_id,
          quantidade: pv.quantidade,
          valor_unitario: prod.preco,
        })
        getDb().prepare(`UPDATE vendas_produtos SET agendamento_id = ? WHERE id = ?`).run(ag.id, vendaId)
        registrarPagamentoCaixa({
          data: hoje, tipo: 'produto', agendamento_id: ag.id, venda_produto_id: vendaId,
          staff_id: ag.staff_id,
          descricao: `${prod.nome} (x${pv.quantidade})`,
          valor_servico: prod.preco * pv.quantidade,
          pagamento_itens,
          valor_recebido_dinheiro: 0, troco: 0,
        })
      }
    }

    confirmarPresenca(ag.id)
    log(`Caixa: pagamento registrado — agendamento #${ag.id}`)
    res.json({ ok: true })
  } catch (e) {
    log('Erro pagar-atendimento:', e.message)
    res.status(500).json({ erro: e.message })
  }
})

receptionRouter.post('/caixa/venda-produto-avulsa', express.json(), (req, res) => {
  const { produto_id, quantidade, staff_id, pagamento_itens, valor_recebido_dinheiro, troco } = req.body || {}
  if (!produto_id || !staff_id || !pagamento_itens?.length) {
    return res.status(400).json({ erro: 'produto_id, staff_id e pagamento_itens são obrigatórios' })
  }
  try {
    const prod = getDb().prepare(`SELECT * FROM produtos WHERE id = ?`).get(produto_id)
    if (!prod) return res.status(404).json({ erro: 'Produto não encontrado' })
    const qtd = Number(quantidade) || 1
    const hoje = hojeStr()
    const vendaId = registrarVendaProdutoAvulsa({ whatsapp_number: 'avulso', produto_id, quantidade: qtd, valor_unitario: prod.preco })
    registrarPagamentoCaixa({
      data: hoje, tipo: 'produto', agendamento_id: null, venda_produto_id: vendaId,
      staff_id,
      descricao: `${prod.nome} (x${qtd}) — avulso`,
      valor_servico: prod.preco * qtd,
      pagamento_itens,
      valor_recebido_dinheiro: Number(valor_recebido_dinheiro) || 0,
      troco: Number(troco) || 0,
    })
    log(`Caixa: venda produto avulso — ${prod.nome} x${qtd}`)
    res.json({ ok: true })
  } catch (e) { log('Erro venda-produto-avulsa:', e.message); res.status(500).json({ erro: e.message }) }
})

receptionRouter.post('/caixa/estornar/:id', (req, res) => {
  const id = Number(req.params.id)
  estornarPagamentoCaixa(id)
  log(`Caixa: estorno pagamento #${id}`)
  res.json({ ok: true })
})

receptionRouter.post('/caixa/definir-fundo', express.urlencoded({ extended: false }), (req, res) => {
  definirFundoInicial(hojeStr(), Number(req.body?.valor) || 0)
  res.redirect(`/${RECEPTION_SECRET}/caixa`)
})

receptionRouter.post('/caixa/fechar', express.urlencoded({ extended: false }), (req, res) => {
  const hoje = hojeStr()
  const resultado = fecharCaixaDia(hoje, 'recepcao')
  if (resultado.erro) return res.redirect(`/${RECEPTION_SECRET}/caixa?msg=pendentes`)

  try {
    const andyPhone = getConfig('andy_phone') || ''
    const andyNum = andyPhone.replace(/\D/g, '').replace(/@.*/, '')
    if (andyNum && andyNum.length >= 10) {
      const jid = andyNum.endsWith('@c.us') ? andyNum : `${andyNum}@c.us`
      const r = resultado.resumo
      const dataLabel = new Date(hoje + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
        weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Sao_Paulo',
      })
      const formasTexto = Object.entries(r.totaisPorForma)
        .filter(([, v]) => v > 0)
        .map(([f, v]) => `  • ${FORMAS_LABEL_SERVER[f] || f}: R$ ${Number(v).toFixed(2).replace('.', ',')}`)
        .join('\n')
      const porBarbeiroTexto = r.porBarbeiro
        .filter(b => b.total > 0)
        .map(b => `  • ${b.nome}: ${b.atendimentos} atend. / ${b.produtos} prod. → R$ ${Number(b.total).toFixed(2).replace('.', ',')}`)
        .join('\n')
      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
      const msg = `📊 *FECHAMENTO DE CAIXA — ${dataLabel.toUpperCase()}*\n\n💰 *Total bruto:* R$ ${Number(r.totalBruto).toFixed(2).replace('.', ',')}\n💸 *Total despesas:* R$ ${Number(r.totalDespesas).toFixed(2).replace('.', ',')}\n✅ *Saldo líquido:* R$ ${Number(r.saldoLiquido).toFixed(2).replace('.', ',')}\n\n📋 *Por forma de pagamento:*\n${formasTexto || '  — Nenhum pagamento'}\n\n👤 *Por barbeiro:*\n${porBarbeiroTexto || '  — Nenhum atendimento'}\n\n🛒 *Atendimentos:* ${r.atendimentos} | *Produtos:* ${r.vendasProdutos}\n💵 *Fundo inicial:* R$ ${Number(r.caixa.fundo_inicial).toFixed(2).replace('.', ',')}\n\n_Fechado às ${hora} pela recepção_`
      enfileirarMensagem(jid, msg, 'critica')
    }
  } catch (e) { log('Erro ao enviar WhatsApp fechamento:', e.message) }

  log(`Caixa: fechado — ${hoje}`)
  res.redirect(`/${RECEPTION_SECRET}/caixa?msg=fechado`)
})

receptionRouter.post('/caixa/reabrir', express.urlencoded({ extended: false }), (req, res) => {
  reabrirCaixaDia(hojeStr())
  log(`Caixa: reaberto — ${hojeStr()}`)
  res.redirect(`/${RECEPTION_SECRET}/caixa?msg=reaberto`)
})

receptionRouter.get('/caixa', (req, res) => {
  const data = req.query.data || hojeStr()
  const resumo = getResumoCaixaDia(data)
  const caixa = resumo.caixa
  const msg = req.query.msg || ''
  const dataLabel = new Date(data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })

  const linhasPag = resumo.pagamentos.length
    ? resumo.pagamentos.map(p => {
        const itens = (() => { try { return JSON.parse(p.pagamento_itens || '[]') } catch { return [] } })()
        const formasStr = itens.map(i => `${FORMAS_LABEL_SERVER[i.forma] || i.forma}: R$${Number(i.valor).toFixed(2).replace('.',',')}`).join(' + ')
        return `<tr>
          <td class="td-muted">${formatDataHoraPainel(p.created_at)}</td>
          <td>${escapeHtml(p.descricao)}</td>
          <td><span style="font-size:.72rem;color:${p.tipo==='produto'?'#f59e0b':'#60a5fa'}">${p.tipo === 'produto' ? 'Produto' : 'Serviço'}</span></td>
          <td>${escapeHtml(p.barbeiro_nome || p.staff_id)}</td>
          <td style="font-size:.75rem;color:#aaa">${escapeHtml(formasStr)}</td>
          <td style="color:var(--green);font-weight:600">${fmtBRL(p.valor_servico)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="if(confirm('Estornar?'))fetch('/${RECEPTION_SECRET}/caixa/estornar/${p.id}',{method:'POST'}).then(()=>location.reload())">Estornar</button></td>
        </tr>`
      }).join('')
    : `<tr><td colspan="7"><div class="empty"><div class="empty-text">Nenhum pagamento registrado hoje</div></div></td></tr>`

  const alertaPendentes = resumo.semPagamento.length
    ? `<div class="alert" style="background:var(--amber-dim);border:1px solid rgba(245,158,11,.3);color:var(--amber);padding:.7rem 1rem;border-radius:var(--radius-sm);font-size:.82rem;margin-bottom:1rem">
        ${ic.warn} <strong>${resumo.semPagamento.length} atendimento(s) sem pagamento:</strong>
        ${resumo.semPagamento.map(a => escapeHtml(`${a.cliente_nome || 'Cliente'} — ${a.servico_nome || a.servico_id} (${formatHora(a.data_hora_inicio)})`)).join(', ')}
      </div>` : ''

  const body = `
  ${msg === 'fechado' ? `<div class="alert alert-success">${ic.check} Caixa fechado! Relatório enviado para o Andy.</div>` : ''}
  ${msg === 'reaberto' ? `<div class="alert alert-success">${ic.check} Caixa reaberto.</div>` : ''}
  ${msg === 'pendentes' ? `<div class="alert" style="background:var(--amber-dim);border:1px solid rgba(245,158,11,.3);color:var(--amber);padding:.7rem 1rem;border-radius:var(--radius-sm);font-size:.82rem;margin-bottom:1rem">${ic.warn} Há atendimentos sem pagamento. Regularize antes de fechar ou use o admin para forçar.</div>` : ''}
  ${alertaPendentes}
  <div class="stats" style="margin-bottom:1.25rem">
    <div class="stat"><div class="stat-icon green">${ic.money}</div><div class="stat-val">${fmtBRL(resumo.totalBruto)}</div><div class="stat-lbl">Total bruto</div><div class="stat-accent green"></div></div>
    <div class="stat"><div class="stat-icon amber">${ic.box}</div><div class="stat-val">${fmtBRL(resumo.totalDespesas)}</div><div class="stat-lbl">Despesas</div></div>
    <div class="stat"><div class="stat-icon ${resumo.saldoLiquido >= 0 ? 'green' : 'red'}">${ic.chart}</div><div class="stat-val">${fmtBRL(resumo.saldoLiquido)}</div><div class="stat-lbl">Saldo líquido</div><div class="stat-accent ${resumo.saldoLiquido >= 0 ? 'green' : ''}"></div></div>
    <div class="stat"><div class="stat-icon blue">${ic.cal}</div><div class="stat-val">${resumo.atendimentos}</div><div class="stat-lbl">Atendimentos</div><div class="stat-accent blue"></div></div>
  </div>
  <div class="section-header"><span class="section-title">Por forma de pagamento</span></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.65rem;margin-bottom:1.25rem">
    ${Object.entries(resumo.totaisPorForma).map(([f, v]) => `<div class="stat" style="padding:.85rem 1rem"><div class="stat-val" style="font-size:1.1rem">${fmtBRL(v)}</div><div class="stat-lbl">${FORMAS_LABEL_SERVER[f] || f}</div></div>`).join('')}
  </div>
  <div class="section-header"><span class="section-title">Por barbeiro</span></div>
  <div class="table-wrap" style="margin-bottom:1.25rem">
    <table>
      <thead><tr><th>Barbeiro</th><th>Atendimentos</th><th>Produtos</th><th>Total</th></tr></thead>
      <tbody>${resumo.porBarbeiro.length ? resumo.porBarbeiro.map(b => `<tr><td>${escapeHtml(b.nome)}</td><td class="td-muted">${b.atendimentos}</td><td class="td-muted">${b.produtos}</td><td style="color:var(--green);font-weight:600">${fmtBRL(b.total)}</td></tr>`).join('') : `<tr><td colspan="4"><div class="empty"><div class="empty-text">Sem dados</div></div></td></tr>`}</tbody>
    </table>
  </div>
  <div class="section-header"><span class="section-title">Pagamentos registrados</span><span class="section-count">${resumo.pagamentos.length}</span></div>
  <div class="table-wrap" style="margin-bottom:1.25rem">
    <table>
      <thead><tr><th>Hora</th><th>Descrição</th><th>Tipo</th><th>Barbeiro</th><th>Formas</th><th>Valor</th><th></th></tr></thead>
      <tbody>${linhasPag}</tbody>
    </table>
  </div>
  <div class="form-card" style="max-width:480px;margin-bottom:1.25rem">
    <div class="form-card-title">${ic.money} Status do caixa</div>
    <div class="config-row" style="padding:.65rem 0">
      <div class="config-meta"><div class="key">Fundo inicial</div><div class="desc">Não entra no faturamento</div></div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <span style="font-weight:600;color:var(--amber)">${fmtBRL(caixa.fundo_inicial)}</span>
        ${caixa.status === 'aberto' ? `<form method="POST" action="/${RECEPTION_SECRET}/caixa/definir-fundo" style="display:flex;gap:.35rem;align-items:center"><input type="number" name="valor" min="0" step="0.01" placeholder="0,00" style="width:90px;padding:.35rem .5rem;font-size:.82rem"><button class="btn btn-ghost btn-sm" type="submit">Atualizar</button></form>` : ''}
      </div>
    </div>
    <div class="config-row" style="padding:.65rem 0">
      <div class="config-meta"><div class="key">Status</div></div>
      ${caixa.status === 'aberto' ? `<span style="color:var(--green);font-weight:600">🟢 Aberto</span>` : `<span style="color:var(--muted);font-weight:600">🔴 Fechado em ${formatDataHoraPainel(caixa.fechado_em)}</span>`}
    </div>
  </div>
  <div style="display:flex;gap:.75rem;flex-wrap:wrap">
    ${caixa.status === 'aberto'
      ? `<form method="POST" action="/${RECEPTION_SECRET}/caixa/fechar"><button type="submit" class="btn btn-primary" onclick="return confirm('Fechar o caixa de hoje? Relatório será enviado para o Andy.')">${ic.check} Fechar caixa do dia</button></form>`
      : `<form method="POST" action="/${RECEPTION_SECRET}/caixa/reabrir"><button type="submit" class="btn btn-ghost" onclick="return confirm('Reabrir o caixa?')">Reabrir caixa</button></form>`}
    <a href="/${RECEPTION_SECRET}/caixa/historico" class="btn btn-ghost">${ic.cal} Histórico</a>
  </div>`

  res.send(shell('caixa', 'Caixa do Dia', dataLabel, body, '', RECEPTION_SECRET))
})

receptionRouter.get('/caixa/historico', (req, res) => {
  const de  = req.query.de  || primeiroDiaMesAtualBR()
  const ate = req.query.ate || hojeStr()
  const caixas = listarCaixas({ dataInicio: de, dataFim: ate, limit: 60 })

  const linhas = caixas.length
    ? caixas.map(c => {
        const r = getResumoCaixaDia(c.data)
        return `<tr>
          <td><a href="/${RECEPTION_SECRET}/caixa?data=${encodeURIComponent(c.data)}" style="color:var(--blue-l)">${escapeHtml(c.data)}</a></td>
          <td style="color:var(--green);font-weight:600">${fmtBRL(r.totalBruto)}</td>
          <td style="color:var(--amber)">${fmtBRL(r.totalDespesas)}</td>
          <td style="color:${r.saldoLiquido>=0?'var(--green)':'var(--red-sem)'};font-weight:600">${fmtBRL(r.saldoLiquido)}</td>
          <td class="td-muted">${r.atendimentos}</td>
          <td>${c.status === 'fechado' ? `<span style="background:rgba(34,197,94,.12);color:#4ade80;padding:.2rem .65rem;border-radius:20px;font-size:.68rem;font-weight:600">Fechado</span>` : `<span style="background:rgba(245,158,11,.12);color:#f59e0b;padding:.2rem .65rem;border-radius:20px;font-size:.68rem;font-weight:600">Aberto</span>`}</td>
        </tr>`
      }).join('')
    : `<tr><td colspan="6"><div class="empty"><div class="empty-text">Nenhum caixa no período</div></div></td></tr>`

  const body = `
  <div class="toolbar" style="margin-bottom:1rem">
    <div class="toolbar-group"><span class="toolbar-label">De</span><input type="date" id="histDe" value="${escapeHtml(de)}"></div>
    <div class="toolbar-group"><span class="toolbar-label">Até</span><input type="date" id="histAte" value="${escapeHtml(ate)}"></div>
    <button class="btn btn-ghost" onclick="filtrar()">Filtrar</button>
  </div>
  <div class="table-wrap">
    <table>
      <thead><tr><th>Data</th><th>Total bruto</th><th>Despesas</th><th>Saldo líquido</th><th>Atend.</th><th>Status</th></tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </div>`

  const script = `function filtrar(){ window.location.href='/${RECEPTION_SECRET}/caixa/historico?de='+document.getElementById('histDe').value+'&ate='+document.getElementById('histAte').value }`
  res.send(shell('caixa', 'Histórico de Caixas', `${de} a ${ate}`, body, script, RECEPTION_SECRET))
})
```

---

## PASSO 9 — ROTA ADMIN: CAIXA HOJE EM TEMPO REAL

Adicionar **após as rotas de `/financeiro/despesas`** do admin:

```javascript
router.get('/financeiro/caixa-hoje', (req, res) => {
  const data = req.query.data || hojeStr()
  const r = getResumoCaixaDia(data)
  const dataLabel = new Date(data + 'T12:00:00-03:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  })

  const body = `
  <div class="toolbar" style="margin-bottom:1.25rem">
    <div class="toolbar-group"><span class="toolbar-label">Data</span><input type="date" id="cxData" value="${escapeHtml(data)}"></div>
    <button class="btn btn-ghost" onclick="window.location.href='/${SECRET}/financeiro/caixa-hoje?data='+document.getElementById('cxData').value">Ver</button>
    <a href="/${SECRET}/financeiro/caixa-hoje" class="btn btn-ghost">Hoje</a>
  </div>
  <div class="stats" style="margin-bottom:1.25rem">
    <div class="stat"><div class="stat-icon green">${ic.money}</div><div class="stat-val">${fmtBRL(r.totalBruto)}</div><div class="stat-lbl">Total bruto</div><div class="stat-accent green"></div></div>
    <div class="stat"><div class="stat-icon amber">${ic.box}</div><div class="stat-val">${fmtBRL(r.totalDespesas)}</div><div class="stat-lbl">Despesas</div></div>
    <div class="stat"><div class="stat-icon ${r.saldoLiquido>=0?'green':'red'}">${ic.chart}</div><div class="stat-val">${fmtBRL(r.saldoLiquido)}</div><div class="stat-lbl">Saldo líquido</div><div class="stat-accent ${r.saldoLiquido>=0?'green':''}"></div></div>
    <div class="stat"><div class="stat-icon blue">${ic.cal}</div><div class="stat-val">${r.atendimentos}</div><div class="stat-lbl">Atendimentos</div><div class="stat-accent blue"></div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:.65rem;margin-bottom:1.25rem">
    ${Object.entries(r.totaisPorForma).map(([f, v]) => `<div class="stat" style="padding:.85rem 1rem"><div class="stat-val" style="font-size:1.1rem">${fmtBRL(v)}</div><div class="stat-lbl">${FORMAS_LABEL_SERVER[f] || f}</div></div>`).join('')}
  </div>
  <div class="section-header"><span class="section-title">Por barbeiro</span></div>
  <div class="table-wrap" style="margin-bottom:1.25rem">
    <table>
      <thead><tr><th>Barbeiro</th><th>Atendimentos</th><th>Produtos</th><th>Total</th></tr></thead>
      <tbody>${r.porBarbeiro.length ? r.porBarbeiro.map(b => `<tr><td>${escapeHtml(b.nome)}</td><td class="td-muted">${b.atendimentos}</td><td class="td-muted">${b.produtos}</td><td style="color:var(--green);font-weight:600">${fmtBRL(b.total)}</td></tr>`).join('') : `<tr><td colspan="4"><div class="empty"><div class="empty-text">Sem dados</div></div></td></tr>`}</tbody>
    </table>
  </div>
  ${r.semPagamento.length ? `<div class="alert" style="background:var(--amber-dim);border:1px solid rgba(245,158,11,.3);color:var(--amber);padding:.7rem 1rem;border-radius:var(--radius-sm);font-size:.82rem">${ic.warn} ${r.semPagamento.length} atendimento(s) concluído(s) sem pagamento.</div>` : ''}
  <p style="font-size:.72rem;color:var(--muted);margin-top:1rem">Status: ${r.caixa.status === 'fechado' ? '🔴 Fechado' : '🟢 Aberto'} · Fundo inicial: ${fmtBRL(r.caixa.fundo_inicial)}${r.caixa.status === 'fechado' ? ` · Fechado em ${formatDataHoraPainel(r.caixa.fechado_em)}` : ''}</p>`

  res.send(shell('financeiro/caixa-hoje', 'Caixa Hoje', dataLabel, body))
})
```

---

## PASSO 10 — CHECKLIST FINAL

Verificar cada item antes de rodar o servidor:

- [ ] `runFinanceiroMigrations()` em `db.mjs` contém as novas chamadas `addColumnIfMissing` e `database.exec`
- [ ] As 8 novas funções exportadas em `db.mjs` estão todas no bloco `import` de `panel.mjs`
- [ ] `FORMAS_LABEL_SERVER` declarada antes de ser usada nas rotas
- [ ] Cards do kanban têm atributos `data-ag-id`, `data-nome`, `data-servico`, `data-barbeiro`, `data-preco`
- [ ] `window.__PRODUTOS__` e `window.RECEPTION_SECRET` injetados no `<script>` do kanban
- [ ] `vaSelectBarbeiro` no modal de venda avulsa preenchido com `${staffOptsKanban}` no servidor
- [ ] O select de produtos no modal de venda avulsa é preenchido via JS (`openVendaAvulsa()`)
- [ ] **NÃO foram alteradas** as tabelas `fechamentos`, `fechamento_agendamentos`, `barbeiros`
- [ ] **NÃO foram removidas** funções existentes de `db.mjs` ou `panel.mjs`

---

## RESUMO DO QUE ESTE MÓDULO IMPLEMENTA

| Funcionalidade | Arquivo | Mecanismo |
|---|---|---|
| Modal de pagamento ao arrastar para "Concluído" | `panel.mjs` kanban JS | Intercepta drop, abre modal |
| Pagamento misto (Pix + Dinheiro + outros) | `caixa_pagamentos.pagamento_itens` | JSON array |
| Cálculo e exibição de troco | Frontend modal | Calculado em tempo real |
| Produtos vendidos no mesmo modal | Frontend modal | Array `produtos_vendidos` |
| Venda de produto avulsa | Modal separado no kanban | Botão "Vender Produto" |
| Tabela `caixas_dia` (um por dia) | `db.mjs` migration | `CREATE TABLE IF NOT EXISTS` |
| Tabela `caixa_pagamentos` (linhas) | `db.mjs` migration | `CREATE TABLE IF NOT EXISTS` |
| Fundo inicial (não entra no faturamento) | `caixas_dia.fundo_inicial` | Separado do totalBruto |
| Fechamento com aviso de pendentes | `fecharCaixaDia()` | Bloqueia se pendentes |
| Reabertura de caixa | `reabrirCaixaDia()` | Disponível para recepção |
| Estorno automático | `estornarPagamentoCaixa()` | Marca estornado=1 e limpa agendamento |
| Relatório WhatsApp ao fechar | `receptionRouter.post('/caixa/fechar')` | Usa `enfileirarMensagem()` |
| Página caixa do dia (recepção) | `receptionRouter.get('/caixa')` | Rota nova |
| Histórico de caixas | `receptionRouter.get('/caixa/historico')` | Rota nova |
| Visão em tempo real para Andy | `router.get('/financeiro/caixa-hoje')` | Rota nova no admin |
| Menu recepção atualizado | `navReception` em `shell()` | Item "Caixa do Dia" |
| Menu admin atualizado | `navFinanceiro` em `shell()` | Item "Caixa Hoje" |

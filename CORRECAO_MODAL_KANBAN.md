# CORREÇÃO CIRÚRGICA — Modais do Kanban no lugar errado

## PROBLEMA IDENTIFICADO

Os 3 modais HTML (`#payOverlay`, `#vendaAvulsaOverlay`, `#fundoOverlay`) foram injetados
dentro do handler `receptionRouter.get('/despesas', ...)` em vez do handler
`receptionRouter.get('/kanban', ...)`.

O script JS dos modais está correto no kanban, mas os elementos HTML não existem nessa página
— por isso o modal não abre ao arrastar o card.

---

## PASSO 1 — Remover os modais do handler de despesas

No handler `receptionRouter.get('/despesas', ...)` em `src/panel.mjs`, localizar e REMOVER
os 3 blocos de `<div class="kb-overlay">` que foram inseridos ali por engano.

Eles começam assim (logo após o `</div>` que fecha o `<div class="table-wrap">` de despesas):

```
  <div class="kb-overlay" id="payOverlay">
    <div class="kb-modal" style="width:500px;max-width:95vw">
    ...
  </div>

  <div class="kb-overlay" id="fundoOverlay">
    ...
  </div>

  <div class="kb-overlay" id="vendaAvulsaOverlay">
    ...
  </div>
```

E terminam antes do:
```
  res.send(shell('despesas', 'Despesas', ...))
```

**Remova apenas esses 3 blocos `kb-overlay`. Não altere nada mais no handler de despesas.**

---

## PASSO 2 — Injetar os modais no handler do kanban

No handler `receptionRouter.get('/kanban', ...)`, localizar a variável `body`.

O `body` termina com o modal de novo agendamento (`#kbOverlay`), que fecha assim:

```javascript
  </div>
  </div>`
```

**Antes desse fechamento final da template string** (antes do backtick que fecha `body`),
adicionar os 3 modais abaixo:

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

  <div class="kb-overlay" id="vendaAvulsaOverlay">
    <div class="kb-modal" style="width:460px;max-width:95vw">
      <button class="kb-modal-close" onclick="closeVendaAvulsa()">✕</button>
      <h3>Venda de Produto</h3>
      <div class="fg">
        <label>Produto</label>
        <select id="vaSelectProduto" onchange="vaAtualizarPreco()">
          <option value="">Selecione...</option>
        </select>
      </div>
      <div class="fg">
        <label>Barbeiro responsável</label>
        <select id="vaSelectBarbeiro">
          ${staffOptsKanban}
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

---

## PASSO 3 — Verificar o drop para "concluido" no script do kanban

No script do kanban (dentro do handler `receptionRouter.get('/kanban', ...)`), verificar
se existe o bloco que intercepta o drop para a coluna `concluido`.

Buscar por `destinoCol === 'concluido'` ou `data-col.*concluido` no evento de drop.

Se não existir, localizar onde o drop é processado (buscar por `drop`, `dragover`,
`moverAgendamentoKanban` ou `data-drag-id` no script) e adicionar a interceptação:

```javascript
// Dentro do handler de drop, ANTES de chamar a API de mover:
if (destinoCol === 'concluido' && origemCol !== 'concluido') {
  const agId     = cardEl.dataset.agId
  const nome     = cardEl.dataset.nome    || ''
  const servico  = cardEl.dataset.servico || ''
  const barbeiro = cardEl.dataset.barbeiro|| ''
  const valor    = cardEl.dataset.preco   || 0
  openPayModal(agId, nome, servico, barbeiro, valor, cardEl, destinoCol)
  return // NÃO mover o card — o modal vai confirmar e chamar a API
}
```

A variável `origemCol` é o `data-drag-status` do card que está sendo arrastado.
A variável `destinoCol` é o `data-col` da coluna onde o card foi solto.
A variável `cardEl` é o elemento DOM do card (`.kb-card`).

---

## CHECKLIST APÓS A CORREÇÃO

- [ ] Os 3 modais (`#payOverlay`, `#fundoOverlay`, `#vendaAvulsaOverlay`) estão APENAS dentro
      do handler do kanban, não no de despesas
- [ ] O drop para coluna `concluido` é interceptado pelo `openPayModal`
- [ ] `node --check src/panel.mjs` passa sem erros
- [ ] Ao arrastar card para "Concluído" no kanban, o modal abre imediatamente

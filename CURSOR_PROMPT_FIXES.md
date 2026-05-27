# PROMPT PARA CURSOR AGENT — CHATBOT ANDY NA RÉGUA
## Correções operacionais (5 problemas confirmados)

Leia este prompt inteiro antes de escrever qualquer código.
Leia cada arquivo mencionado antes de editar.
Faça edições cirúrgicas — não reescreva blocos que não estão no escopo.
Se qualquer ponto estiver ambíguo, PARE e pergunte antes de inventar.

---

## PROBLEMA 1 — Nome do cliente não salva quando enviado pelo WhatsApp

**Arquivo:** `src/whatsapp.mjs`
**Causa raiz:** A função `upsertCliente(userPhone)` é chamada sem o nome na linha de processamento da mensagem. O nome só é salvo quando a tool `criar_agendamento` roda — mas o cliente já estava cadastrado sem nome e o `upsertCliente` tem lógica de `INSERT OR IGNORE`, então o nome nunca atualiza.

**O que fazer:**

1. Leia o arquivo `src/whatsapp.mjs` completo antes de editar.
2. Leia o arquivo `src/claude.mjs` para entender quando o nome do cliente é capturado pelo bot.
3. Leia a função `upsertCliente` em `src/db.mjs` — ela já aceita um segundo parâmetro `nome` e **já tem lógica de UPDATE se o nome mudar**. O problema é que nunca é chamada com o nome.

**A correção:**

Em `src/claude.mjs`, localize onde a resposta do Claude é processada e onde o nome do cliente é extraído da conversa (provavelmente quando a tool `criar_agendamento` retorna ou quando o bot pergunta o nome). Após identificar o momento exato em que o nome é conhecido, certifique-se de chamar:

```javascript
upsertCliente(whatsappNumber, nomeExtraido)
```

Também verifique se existe algum ponto em `src/tools.mjs` onde `criarAgendamentoTool` é chamada com `cliente_nome` — nesse ponto, após a criação bem-sucedida, chamar `upsertCliente(whatsappNumber, clienteNome)` para garantir que a tabela `clientes` sempre tenha o nome atualizado.

**Restrições:**
- Não altere o schema do banco.
- Não altere a assinatura da função `upsertCliente`.
- Não adicione lógica de parsing de nome — apenas garanta que quando o nome já existe no contexto da conversa, ele seja persistido.

---

## PROBLEMA 2 — Agenda não permite editar agendamento (só deletar)

**Arquivo:** `src/panel.mjs`
**Localização:** função `agendaHandler` (em torno da linha 1420–1610), dentro do map de `agendaCards`.

**O que está faltando:** Cada card de agendamento com status `confirmado` tem apenas o botão de deletar (lixeira). Precisamos adicionar um botão de **editar** que abre um formulário inline ou redireciona para uma página de edição.

**O que fazer:**

1. Leia o arquivo `src/panel.mjs` completo antes de editar.
2. Leia a função `agendarManualGetHandler` e `agendarManualPostHandler` — a página de edição vai reutilizar o mesmo layout.

**Implementação:**

**Passo A — Adicionar botão de editar no card da agenda:**

No map de `agendaCards`, dentro da `div.agenda-aside`, adicione ao lado do botão de deletar (para agendamentos com status `confirmado`):

```html
<a href="/${secret}/agenda/editar/${ag.id}?data=${data}" class="btn btn-ghost btn-sm">${ic.gear}</a>
```

**Passo B — Criar rota GET `/agenda/editar/:id`:**

Registrar para `router` e `receptionRouter`. A rota deve:
- Buscar o agendamento pelo ID usando `getDb().prepare('SELECT * FROM agendamentos WHERE id = ?').get(id)`
- Se não encontrar, redirecionar de volta para `/agenda?data=hoje`
- Renderizar um formulário com os campos pré-preenchidos: `cliente_nome`, `whatsapp_number` (somente exibição, não editável), `servico_id` (select dos serviços ativos), `staff_id` (select dos barbeiros), data e horário extraídos de `data_hora_inicio`
- Usar o mesmo `shell()` com título "Editar Agendamento"

**Passo C — Criar rota POST `/agenda/editar/:id`:**

A rota deve:
- Receber `nome`, `servico_id`, `staff_id`, `data`, `horario` do body
- Validar que todos os campos obrigatórios estão preenchidos
- Montar `start_iso = \`${data}T${horario}:00-03:00\``
- Buscar o serviço em `getServicosAtivos()` para calcular `duracao_minutos`
- Calcular `end_iso` somando `duracao_minutos` ao `start_iso`
- Executar UPDATE no banco:
  ```javascript
  getDb().prepare(`
    UPDATE agendamentos
    SET cliente_nome = ?, servico_id = ?, staff_id = ?,
        data_hora_inicio = ?, data_hora_fim = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(nome, servico_id, staff_id, start_iso, end_iso, id)
  ```
- Se o agendamento tinha `google_event_id`, chamar `deleteEvent(ag.staff_id, ag.google_event_id)` para remover o evento antigo, e depois `createEvent(staff_id, { summary, startTime, endTime })` para criar o novo
- Redirecionar para `/${secret}/agenda?data=${data}&msg=editado`
- Na agenda, adicionar o alert de `msg=editado`: `<div class="alert alert-success">Agendamento atualizado.</div>`

**Restrições:**
- Não altere o schema do banco.
- Não use JavaScript do lado do cliente para atualizar — use POST tradicional igual ao padrão do projeto.
- O formato do `start_iso` deve ser exatamente `YYYY-MM-DDTHH:MM:00-03:00` para consistência com o restante do código.

---

## PROBLEMA 3 — Menu lateral não exibe seção "Financeiro"

**Arquivo:** `src/panel.mjs`
**Causa raiz:** A função `shell()` monta o menu lateral. Inspecionando o código, existe o array `navFinanceiro` com itens de `/financeiro`, `/financeiro/comissoes`, etc., e eles são adicionados ao `navHtml` — mas apenas quando `isReception` é `false`. O problema é verificar se as rotas do financeiro estão de fato registradas e se o `SECRET` está sendo passado corretamente.

**O que fazer:**

1. Leia a função `shell()` em `src/panel.mjs` — confirme que `navFinanceiro` está sendo montado corretamente para o perfil admin.
2. Verifique se as rotas `router.get('/financeiro', ...)` estão registradas no `router` (que usa o `SECRET` de admin).
3. Verifique se em `src/whatsapp.mjs` (ou `src/demo.mjs`) o `router` é montado com `app.use(\`/${SECRET}\`, panelRouter)` — se sim, a URL correta é `http://localhost:21466/painel-andy-regua-2024/financeiro`.

**A correção:**

Se as rotas existem mas o link não aparece, o problema provavelmente está no `isSidebarNavActive` ou na construção do `navHtml`. Verifique se a condição `if (isReception)` está excluindo o menu financeiro para o admin. Se estiver, corrija para que o bloco `else` sempre inclua `navFinanceiro`.

Se as rotas `/financeiro` não estiverem registradas no `router` (apenas no `barbeiroRouter`), adicione os `router.get('/financeiro', ...)` correspondentes apontando para os handlers existentes.

**Restrições:**
- Não duplique rotas.
- Não altere o CSS ou layout do menu.
- Apenas confirme e corrija o registro das rotas e a montagem do `navHtml`.

---

## PROBLEMA 4 — Painel do barbeiro retorna 404 em `/painel/login`

**Arquivo:** `src/panel.mjs` e `src/demo.mjs`
**Causa raiz confirmada pela imagem:** O browser mostra `GET http://localhost:21466/painel/login 404 (Not Found)`. Isso significa que o `loginRouter` não está sendo montado no Express.

**O que fazer:**

1. Leia `src/demo.mjs` completo.
2. Leia o final de `src/panel.mjs` — procure a função `registrarRotasPublicasPainel`.
3. Verifique se `registrarRotasPublicasPainel(app)` está sendo chamada em `demo.mjs` **antes** de `startHttpServer()`.

A função exportada é:
```javascript
export function registrarRotasPublicasPainel(appInstance) {
  appInstance.use('/painel', loginRouter)
  appInstance.use(`/${RECEPTION_SECRET}`, receptionRouter)
  appInstance.use('/barbeiro', barbeiroRouter)
}
```

**A correção:**

Em `src/demo.mjs`, verifique a ordem das chamadas. A ordem correta deve ser:

```javascript
initDb({ services, products })
const app = createExpressApp()         // monta /api e rotas do WhatsApp
registrarRotasPublicasPainel(app)      // monta /painel/login, /barbeiro/*
startHttpServer()                      // só depois de todas as rotas montadas
```

Se `registrarRotasPublicasPainel` já está sendo chamada mas ainda dá 404, verifique se `createExpressApp()` está chamando `app.use(\`/${SECRET}\`, panelRouter)` — e se o `loginRouter` é montado separadamente em `/painel`. Se o Express não conhece `/painel` como rota, o 404 é esperado.

Confirme também que `loginRouter` exportado de `panel.mjs` inclui a rota `GET /login` — ela deve existir em `loginRouter.get('/login', ...)`.

**Restrições:**
- Não altere a lógica de autenticação.
- Não altere as rotas existentes do painel admin.
- Apenas corrija a ordem de montagem ou o registro da rota `/painel`.

---

## PROBLEMA 5 — Slots passados aparecem disponíveis na agenda

**Arquivos:** `src/panel.mjs` (rota da agenda) e `src/booking.mjs` (API de disponibilidade usada pelo bot)
**Comportamento atual:** Quando abre a agenda às 17h, os slots das 9h ainda aparecem como disponíveis.
**Comportamento esperado:** 
- Horários que já passaram: mostrar o "fantasma" do card (espaço vazio com borda tracejada, sem informação) para que o admin veja que ali havia/poderia haver um horário
- Horários reservados mas já passados: mostrar normalmente (cliente que passou)
- Slots futuros disponíveis: mostrar normalmente

**O que fazer:**

1. Leia `src/panel.mjs` — função `agendaHandler` — para entender como os cards da agenda são renderizados hoje.
2. Leia `src/booking.mjs` — procure a função que calcula slots disponíveis para entender como os horários são gerados.

**Correção A — Na exibição da agenda (panel.mjs):**

Na função `agendaHandler`, após buscar os agendamentos do dia (`getAgendamentosDia`), adicionar lógica para gerar os "slots fantasma":

```javascript
// Após buscar os agendamentos reais, para o dia atual, gerar os slots passados sem agendamento
const agora = new Date()
const ehHoje = data === hojeStr()
// Só mostrar fantasmas para o dia de hoje
```

Para isso, precisamos dos slots teóricos do dia. Usar os horários de abertura/fechamento da config:
```javascript
const horarioAbertura = getConfig('horario_abertura') || '08:00'
const horarioFechamento = getConfig('horario_fechamento') || '22:00'
```

Gerar slots de 30 em 30 minutos (padrão do projeto) do horário de abertura até a hora atual (para o dia de hoje). Para cada slot gerado, verificar se existe algum agendamento cobrindo aquele horário. Se não existir e o slot já passou, renderizar um card "fantasma":

```html
<div class="agenda-card agenda-card--ghost" style="opacity:0.25;border-style:dashed;pointer-events:none">
  <div class="agenda-time-block">
    <div class="agenda-hour">${horaSlot}</div>
    <div class="agenda-end">slot livre</div>
  </div>
  <div class="agenda-body" style="color:var(--muted2)">— disponível —</div>
  <div class="agenda-aside"></div>
</div>
```

**Correção B — Na API de disponibilidade (booking.mjs):**

Localize a função que lista slots disponíveis para agendamento (usada pelo bot e pela página pública). Adicione o filtro:

```javascript
// Filtrar slots que já passaram + margem mínima de antecedência
const antecedenciaMinutos = Number(getConfig('antecedencia_minima_minutos') || 30)
const agora = new Date()
const limiteMinimo = new Date(agora.getTime() + antecedenciaMinutos * 60 * 1000)
slots = slots.filter(slot => new Date(slot.inicio) >= limiteMinimo)
```

Esse filtro deve estar presente tanto na rota pública de disponibilidade quanto na tool `verificar_disponibilidade` em `src/tools.mjs`.

**Restrições:**
- Os cards fantasma só aparecem quando `data === hojeStr()` — não para dias futuros ou passados.
- Não altere o schema do banco.
- Não altere a lógica de cálculo de conflitos — apenas adicione o filtro de tempo passado.
- O filtro de slots passados no booking deve usar `antecedencia_minima_minutos` da tabela `configuracoes`, não um valor hardcoded.

---

## CHECKLIST FINAL PARA O AGENTE

Antes de entregar, confirme:

- [ ] `upsertCliente` é chamada com nome quando o nome é conhecido
- [ ] Rota GET `/agenda/editar/:id` existe e renderiza formulário preenchido
- [ ] Rota POST `/agenda/editar/:id` atualiza banco e Google Calendar
- [ ] Menu lateral exibe "Financeiro" e subitens para o perfil admin
- [ ] `GET /painel/login` retorna 200 (não 404)
- [ ] `POST /painel/login` funciona para barbeiro com nome + senha
- [ ] Slots passados não aparecem disponíveis na API de booking
- [ ] Cards fantasma aparecem apenas para o dia atual na agenda
- [ ] Nenhum arquivo foi reescrito por completo — apenas edições cirúrgicas
- [ ] Nenhuma dependência nova foi adicionada ao package.json

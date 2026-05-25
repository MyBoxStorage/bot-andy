# PROMPT — CLAUDE.AI/DESIGN: Andy Na Régua — Sistema Visual Completo

## BRIEFING DO PROJETO

Preciso do sistema visual completo para o **Andy Na Régua Barbearia** — uma barbearia premium em Balneário Camboriú, SC. O projeto tem dois entregáveis visuais:

1. **Landing de agendamento** — interface mobile-first que o cliente acessa pelo WhatsApp
2. **Painel administrativo** — dashboard que o dono (Andy) e a secretária usam no dia a dia

---

## IDENTIDADE DA MARCA

**Nome**: Andy Na Régua Barbearia
**Localização**: Balneário Camboriú, SC — cidade litorânea de alto padrão
**Público**: Homens entre 18–45 anos, urbanos, que valorizam cuidado pessoal e experiência premium
**Logo**: Tipografia blackletter gothic, 100% preto e branco — estilo street/urban refinado. Sem dourado, sem cores vibrantes na identidade primária.

### Paleta exata a usar
- **Fundo principal**: `#000000` (preto puro)
- **Superfícies**: `#0a0a0a`, `#111111`, `#1a1a1a`
- **Texto principal**: `#f0ece4` (branco warm)
- **Texto secundário**: `#888888`
- **Bordas**: `rgba(255,255,255,0.07)` a `rgba(255,255,255,0.12)`

**Cores de destaque (Barber Pole):**
- **Vermelho** `#cc1f1f` → botões primários, CTAs, ações principais, item ativo na nav
- **Azul** `#2563eb` → horários disponíveis, confirmações, dados de agenda
- **Branco** `#ffffff` → chips selecionados, destaques, texto primário

**Cores semânticas (manter padrão):**
- Verde `#22c55e` → faturamento, sucesso, online
- Âmbar `#f59e0b` → avisos, estoque baixo
- Vermelho `#ef4444` → erros, cancelamentos, exclusões

---

## ENTREGÁVEL 1: LANDING DE AGENDAMENTO

### Contexto
O cliente recebe um link no WhatsApp e abre em 3 segundos no celular. A experiência precisa ser **imediata, clara e confiante**. É um fluxo de 4 passos:

**Passo 1** → Escolher serviço (chips de categoria: Todos / Cabelo / Barba / Estética → cards de serviço)
**Passo 2** → Escolher barbeiro (opção "qualquer disponível" + cards dos barbeiros)
**Passo 3** → Escolher data (scroll horizontal de datas) + horário (grid 3 colunas)
**Passo 4** → Dados (nome + WhatsApp) + confirmação final

### O que preciso visualizar

**A) Tela do Passo 1 — Escolha de serviço**

Layout:
- Header fixo no topo: logo real centralizada + "AGENDAMENTO ONLINE" discreto abaixo. Fundo `#000000` para acompanhar a logo (que tem fundo preto). Barra de progresso de 4 etapas logo abaixo — segmentos brancos.
- Chips de categoria: pills horizontais scrolláveis. Chip ativo: fundo `#ffffff`, texto preto, sem borda. Chip inativo: fundo transparente, borda `rgba(255,255,255,0.12)`, texto `#888`.
- Cards de serviço: altura ~72px, fundo `#111`, borda sutil `rgba(255,255,255,0.07)`. Nome do serviço à esquerda (branco, font-weight 600), preço à direita (branco, font-weight 700). Duração abaixo em cinza. Hover/active: borda `rgba(255,255,255,0.2)`.

**B) Tela do Passo 3 — Data e horário**

- Scroll horizontal de datas: pills compactos com dia da semana (texto cinza pequeno) + número/mês. Selecionado: fundo `rgba(255,255,255,0.1)`, borda branca. Não selecionado: fundo `#111`, borda `rgba(255,255,255,0.1)`.
- Grid de horários: 3 colunas. Cada slot: fundo `rgba(37,99,235,0.10)`, borda `rgba(37,99,235,0.35)`, texto `#3b82f6`. Canto arredondado `border-radius:12px`. Hover: fundo `rgba(37,99,235,0.18)`.

**C) Tela do Passo 5 — Confirmação**

- Ícone de check grande centralizado (não emoji — SVG limpo, azul `#2563eb` com círculo de fundo `rgba(37,99,235,0.12)`)
- "Agendado!" em tipografia grande branca
- Card com resumo do agendamento (fundo `#111`, borda `rgba(255,255,255,0.1)`)
- 4 CTAs empilhados:
  1. "Fazer outro agendamento" — fundo `#cc1f1f` vermelho, texto branco
  2. "Salvar no calendário" — fundo `rgba(37,99,235,0.1)`, borda azul, texto azul, ícone de calendário
  3. "Seguir @andynaregua" — fundo `#111`, borda `rgba(255,255,255,0.1)`, ícone Instagram, texto branco/cinza
  4. "Ver no mapa" — fundo `#111`, borda sutil, texto cinza

**D) Footer fixo**

- Fundo `rgba(0,0,0,0.95)`, borda topo sutil
- Endereço: "Rua 900, nº 41 (Antigo China Center) — Balneário Camboriú/SC"
- Link do Instagram em azul

### Elemento decorativo sutil
Um barber pole estilizado — linha horizontal de `3px` com gradiente cíclico: vermelho `#cc1f1f` → branco → azul `#2563eb` → vermelho. Opacidade 40–50%. Aplicado como separador em pontos estratégicos (abaixo do header, acima do footer).

### Tipografia
- Fonte base: **Inter** (já carregada via Google Fonts)
- Títulos de passo: 20–22px, font-weight 700, tracking ligeiramente negativo
- Subtítulos: 13–14px, font-weight 400, cor `#888`
- Labels de categoria: 10px, uppercase, letter-spacing 0.08em
- Botão principal: 15–16px, font-weight 600

---

## ENTREGÁVEL 2: PAINEL ADMINISTRATIVO

### Contexto
Dashboard web usado pelo Andy (dono, acesso total) e pela secretária (apenas agenda). Stack: HTML puro server-side rendered. Precisa funcionar bem em mobile também (sidebar vira drawer).

### O que preciso visualizar

**A) Layout principal — Agenda do dia**

- **Sidebar esquerda** (220px): fundo `#0a0a0a`, borda direita `rgba(255,255,255,0.07)`. No topo: logo da barbearia (a mesma blackletter, pequena). Itens de nav: ícone SVG + label. Item ativo: texto `#cc1f1f` vermelho, borda-esquerda `2px solid #cc1f1f`, fundo levíssimo `rgba(204,31,31,0.06)`. No rodapé da sidebar: listinha barber pole decorativa (3px, gradiente vermelho/branco/azul cíclico) + "Online · 14:30 · seg 26/mai".

- **Topbar**: "Agenda" como título principal. Subtítulo com a data. À direita: botão "Novo agendamento" (fundo vermelho `#cc1f1f`).

- **Cards de stats** (4 em row): Agendamentos, Em serviços (verde), Em produtos (azul), Total do dia. Cada card: fundo `#111`, borda, ícone colorido em círculo, valor grande, label pequeno. Linha de 2px colorida na base do card (vermelho para total, verde para serviços, azul para produtos).

- **Cards de agendamento**: Layout em 3 colunas — coluna de hora (hora em branco bold + "até XX:XX" em cinza), coluna central (nome do cliente bold + nome do serviço cinza + tag do barbeiro), coluna direita (badge de status + preço em verde + botão cancelar). Badge de status: "Confirmado" em verde pílula, "Cancelado" em vermelho pílula, "Concluído" em azul pílula.

**B) Estoque — com melhorias**

- Cards de produto em grid 2-col (mobile: 1-col)
- Cada card: nome do produto (bold), descrição (cinza, 2 linhas), preço (branco bold)
- Linha de estoque atual: label + count colorido (verde se ok, âmbar se baixo, vermelho se zero)
- Barra de progresso colorida (verde/âmbar/vermelho conforme estoque)
- **Stepper de ajuste rápido**: botão "−" + número atual + botão "+" (sem formulário longo)
- Botões secundários: "Editar" e "Desativar"

**C) Faturamento — abas de período**

- 3 tabs: "7 dias" | "Este mês" | "Este ano". Tab ativa: fundo vermelho.
- Stats em row: Serviços (verde), Produtos (azul), Total, Atendimentos
- Dois charts lado a lado: doughnut (Serviços × Produtos) + bar chart do período
- Tabela de detalhamento

**D) Login**

- Página centralizada, card no centro da tela
- Logo grande da barbearia no topo do card
- Campo de senha + botão "Entrar" (vermelho)
- Background completamente preto com sutil ruído de textura (noise)

### Mobile (drawer)

- Botão hamburguer no topbar (aparece só no mobile)
- Sidebar desliza da esquerda como drawer com overlay escuro ao fundo

---

## DIREÇÃO CRIATIVA GERAL

**Mood**: Barbearia de alta performance. Não é vintage nem rustic. É **precisão cirúrgica + street culture**. Como a logo blackletter sugere — tradicional no traço, contemporâneo na atitude.

**Referência de atmosfera**: O estilo visual de apps como Barber.io, Square Appointments — mas com a agressividade visual de uma marca de streetwear premium. Preto profundo, branco clean, toques de vermelho pontual como sangue de navalha.

**O que NÃO fazer**:
- Gradientes coloridos pesados
- Glassmorphism exagerado
- Cards com sombra colorida/glow
- Qualquer tom dourado ou âmbar como destaque principal
- Layouts assimétricos confusos
- Tipografia decorativa no corpo do texto (blackletter só na logo)

**O que FAZER**:
- Espaçamento generoso e hierarquia clara
- Bordas sutis que criam profundidade sem chamar atenção
- A linha barber pole (vermelho/branco/azul, 3px) como assinatura visual recorrente e discreta
- Ícones SVG limpos, linha única, stroke-width 1.8
- Transições suaves (150–200ms) em hover e seleção
- Feedback visual imediato em todo clique (active:scale-[.98])

---

## OUTPUT ESPERADO

Por favor, entregue mockups/screens para:

1. **Landing — Passo 1** (escolha de serviço, chips de categoria ativos)
2. **Landing — Passo 3** (data + horário, slots azuis)
3. **Landing — Passo 5** (confirmação, todos os CTAs)
4. **Painel — Agenda do dia** (sidebar + topbar + stats + cards de agendamento)
5. **Painel — Estoque** (grid de produtos com stepper de ajuste)
6. **Painel — Login**

Resolução mobile para a landing (390px de largura), desktop para o painel (1280px).

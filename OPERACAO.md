# Como operar o sistema Andy Na Régua

> Versão para entrega gradual: landing na Vercel + bot na VPS (quando contratada).

## Links públicos

| O quê | URL (ajuste após deploy) |
|--------|---------------------------|
| **Agendamento online** | `https://SEU-PROJETO.vercel.app/agendar` |
| **Painel admin** | `http://IP-DA-VPS:21466/painel-andy-regua-2024/agenda` (HTTPS com domínio na entrega final) |

## Painel admin (demonstração)

- Caminho: `/painel-andy-regua-2024/agenda`
- Usuário Basic Auth (quando Caddy estiver ativo): `andy`
- Senha temporária de demo: `987654321` — **trocar na entrega**

## WhatsApp em produção

- Número definitivo: **+55 47 9930-4942**
- Migração gradual: use primeiro um chip de teste com `WPP_SESSION=andy-teste` por alguns dias; depois troque para `WPP_SESSION=andy-prod` e escaneie o QR no servidor.

## Reiniciar o bot (VPS)

```bash
pm2 restart all
```

## Ver logs

```bash
pm2 logs --lines 50
```

## Bot / WhatsApp desconectou

1. Verifique `pm2 logs --lines 100` (procure "Authenticated").
2. Se precisar escanear QR de novo:
   ```bash
   pm2 stop all
   cd /home/andybot/chatbot && node demo.mjs
   ```
   No seu PC: `ssh -L 21466:localhost:21466 andybot@IP-DA-VPS` e abra `http://localhost:21466/qr`.
3. Após conectar: `Ctrl+C` e `pm2 start ecosystem.config.cjs`.

## Configurações (Pix, Google Review, horários)

Painel → **Config** → salvar (efeito imediato).

## Landing na Vercel + API do bot

A página fica na Vercel; as APIs (`/api/servicos`, `/api/agendar`, etc.) rodam no **mesmo servidor do bot**.

1. No `.env` da VPS, defina:
   ```env
   PUBLIC_BOOKING_ORIGINS=https://SEU-PROJETO.vercel.app
   ```
2. Em `public/agendar.html`, linha `window.__API_BASE__`, coloque a URL pública do bot, por exemplo:
   ```html
   <script>window.__API_BASE__ = 'https://bot.seudominio.com.br';</script>
   ```
   Ou use rewrites na Vercel apontando `/api/*` para a VPS (ver `DEPLOY_VERCEL.md`).

Sem isso, a landing na Vercel carrega mas não agenda.

## Backup (Cloudflare R2)

- Litestream na VPS (configurar na entrega com credenciais R2).
- Restauração: chamar o desenvolvedor.

## Custos mensais (estimativa)

| Item | Valor |
|------|--------|
| VPS (Contabo/Hetzner) | ~R$ 25–35 |
| Vercel (landing) | R$ 0 (hobby) |
| Domínio próprio (opcional depois) | ~R$ 3/mês |
| Cloudflare R2 | grátis até 10 GB |
| Claude API | ~US$ 2–5 |

## Quando chamar o desenvolvedor

- Bot respondendo errado de forma consistente
- Mensagens não chegam
- Painel não abre
- Adicionar/remover barbeiro
- Mudança grande de regra de negócio
- Restaurar backup

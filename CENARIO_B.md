# Cenário B — Vercel + bot no PC (demo)

Landing na Vercel chama a API do bot no seu computador via túnel HTTPS (Cloudflare).

## Pré-requisitos

- Node.js instalado
- Projeto na Vercel (`andy-na-regua.vercel.app` ou ajuste a URL no script)
- `.env` configurado (Google Calendar, etc.)
- WhatsApp conectado (`npm start` escaneou QR)

## Passo a passo (3 terminais)

### Terminal 1 — Bot

```powershell
cd C:\Users\pc\Desktop\Projetos\CHATBOT
npm start
```

Aguarde **WhatsApp conectado**.

### Terminal 2 — Túnel + CORS

```powershell
cd C:\Users\pc\Desktop\Projetos\CHATBOT
npm run tunnel
```

O script:

1. Define `PUBLIC_BOOKING_ORIGINS=https://andy-na-regua.vercel.app` no `.env`
2. Abre túnel `https://xxxx.trycloudflare.com` → porta `21466`
3. Atualiza `public/config.js` com a URL do túnel

**Reinicie o bot (Terminal 1)** após a primeira vez que o script alterar o `.env` (`Ctrl+C` → `npm start`).

Deixe o Terminal 2 **aberto** durante toda a demo.

### Terminal 3 — Deploy Vercel (quando o túnel mudar de URL)

Cada vez que o túnel gerar URL nova, faça um destes:

**Opção A — Variável no painel Vercel (recomendado)**

1. [vercel.com](https://vercel.com) → projeto → Settings → Environment Variables
2. `BOOKING_API_BASE` = `https://xxxx.trycloudflare.com` (copie do Terminal 2)
3. Redeploy: Deployments → ⋯ → Redeploy

**Opção B — CLI**

```powershell
$env:BOOKING_API_BASE = "https://xxxx.trycloudflare.com"
npm run vercel:deploy
```

## Testar

| O quê | URL |
|--------|-----|
| Cliente agenda (celular) | `https://andy-na-regua.vercel.app/agendar` |
| Você mostra a agenda | `http://localhost:21466/painel-andy-regua-2024/agenda` |

Após agendar: recarregue o painel na data do teste — o horário aparece na lista.

## Mostrar para o Andy

1. Celular dele abre o link Vercel e faz um agendamento de teste.
2. Tela verde “Agendado!” no celular.
3. Seu notebook no **painel → Agenda** (mesmo dia).
4. (Opcional) Mensagem no WhatsApp se o bot estiver online e o número do form for válido.

## Problemas comuns

| Sintoma | Solução |
|---------|---------|
| “Não foi possível carregar” na landing | `BOOKING_API_BASE` na Vercel ≠ URL do túnel atual → redeploy |
| CORS / bloqueio no navegador | Reiniciar bot após mudar `.env`; URL Vercel exata em `PUBLIC_BOOKING_ORIGINS` |
| Túnel caiu | Rodar `npm run tunnel` de novo → nova URL → redeploy Vercel |
| Horário não aparece no painel | Data errada no filtro; recarregar F5 |

## URL Vercel diferente?

```powershell
.\scripts\cenario-b.ps1 -VercelOrigin "https://seu-projeto.vercel.app"
```

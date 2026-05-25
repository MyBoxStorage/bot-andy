# Deploy da landing na Vercel

## 1. Publicar

1. Crie conta em [vercel.com](https://vercel.com) e conecte o repositório Git do projeto (ou use CLI).
2. **Root Directory:** raiz do repo (`CHATBOT`).
3. A Vercel detecta `vercel.json` e publica só a pasta `public/`.
4. URL gerada: `https://nome-do-projeto.vercel.app/agendar`

## 2. Conectar à API do bot

A landing precisa falar com o Express na porta `21466` (VPS ou túnel temporário).

**Opção A — API_BASE no HTML (mais simples)**

Edite `public/agendar.html` antes do deploy:

```html
<script>window.__API_BASE__ = 'https://SEU-BOT-EXPOSTO.com';</script>
```

No servidor do bot, `.env`:

```env
PUBLIC_BOOKING_ORIGINS=https://nome-do-projeto.vercel.app
```

**Opção B — Rewrite na Vercel** (quando o bot tiver URL HTTPS)

Em `vercel.json`, adicione (substitua a URL):

```json
"rewrites": [
  { "source": "/api/:path*", "destination": "https://BOT-URL/api/:path*" },
  { "source": "/agendar", "destination": "/agendar.html" },
  { "source": "/", "destination": "/agendar.html" }
]
```

Com rewrite, deixe `window.__API_BASE__ = ''` (mesma origem).

## 3. Open Graph

Adicione imagem `public/agendar/assets/og-cover.jpg` (1200×630, logo + “Agende online”).

Atualize as URLs `og:url` e `og:image` em `agendar.html` com o domínio real da Vercel.

## 4. Cenário B (demo com bot no PC)

Guia completo: **`CENARIO_B.md`**

Resumo: `npm start` → `npm run tunnel` → configurar `BOOKING_API_BASE` na Vercel → abrir `/agendar`.

## 5. Teste local (sem Vercel)

```bash
npm start
# Abra http://localhost:21466/agendar
```

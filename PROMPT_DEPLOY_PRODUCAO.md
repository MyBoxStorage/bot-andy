# PROMPT PARA AGENTE IA — Deploy em Produção + Landing Page de Agendamento

> **Como usar:** anexe este arquivo no chat de um agente IA com acesso a terminal/SSH (Claude com computer use, Cursor com terminal, ou similar). Mande: *"Execute integralmente este plano, na ordem definida. Pause em cada etapa marcada como CHECKPOINT e me confirme antes de prosseguir."*

---

## 0. CONTEXTO DO PROJETO

Você é o engenheiro de DevOps + fullstack responsável por colocar em produção o chatbot **Andy Na Régua** — barbearia em Balneário Camboriú/SC.

**Estado atual:** projeto roda 100% funcional em Windows local (`C:\Users\pc\Desktop\Projetos\CHATBOT`), validado em testes manuais e cenários automatizados. Tudo commitado no git (branch `main`).

**Stack imutável** (não substitua, integre):
- Node.js 24 + ES Modules (.mjs)
- WPPConnect (Puppeteer/Chromium real — não funciona em serverless)
- Claude API (`claude-haiku-4-5-20251001`) com tool use
- Google Calendar API (OAuth 2.0, 4 agendas)
- SQLite (`better-sqlite3`)
- Express (painel admin em `/painel-andy-regua-2024/...`)
- node-cron (lembretes, retry, limpeza)
- PM2 (já tem `ecosystem.config.cjs` no projeto)

**Arquivos principais:** `src/{whatsapp,claude,tools,calendar,db,reminders,panel,messages,security,queue}.mjs`, `demo.mjs` (entry point), `package.json`, `.env`.

---

## 1. OBJETIVOS

**Objetivo 1 — Subir o bot 24/7 em produção** com acesso remoto ao painel admin via domínio HTTPS, de qualquer lugar.

**Objetivo 2 — Landing page de agendamento online** estilo apps modernos (Booksy, Treatwell, Belezinha), mobile-first, em path `/agendar`, sincronizada com o Google Calendar (zero conflito entre canal WhatsApp e canal web).

**Objetivo 3 — Operação sustentável pelo Andy** depois (dono não-técnico): documentação simples, comandos de uma linha pra restart/backup/logs, sem dependência do desenvolvedor pra coisas rotineiras.

---

## 2. DECISÕES TÉCNICAS JÁ TOMADAS

| Item | Escolha | Justificativa |
|---|---|---|
| Hospedagem | **VPS Linux Ubuntu 24.04** | WPPConnect precisa de Chromium real (serverless tipo Vercel não serve). Custo previsível. Andy entende "uma máquina virtual". |
| Provedor recomendado | **Contabo VPS S** (~€5/mês, 4 vCPU/8GB) **ou Hetzner CX22** (€4.5/mês, 2 vCPU/4GB, latência menor) | Ambos têm boa latência BR. Contabo é melhor custo-benefício; Hetzner é mais estável. |
| Reverse proxy + HTTPS | **Caddy 2** | HTTPS automático via Let's Encrypt, config 5x mais simples que nginx, 1 arquivo `Caddyfile`. |
| Process manager | **PM2** | Já presente no projeto, restart automático, logs centralizados. |
| Domínio | **Cloudflare Registrar** (mais barato) ou Registro.br | Sugerir `andynaregua.com.br` (~R$40/ano). Andy pode comprar antes ou no início do deploy. |
| Auth do painel admin | **Basic Auth via Caddy** + path obscuro existente | Senha forte protege a tela administrativa sem complicar UI. |
| Landing page stack | **HTML + Tailwind CDN + Alpine.js** | Zero build step, integra no Express atual em `/agendar`, leve (≤100KB), mobile-first. Sem framework pesado. |
| Backup do SQLite | **Litestream** → S3-compatible (Backblaze B2 free tier ou Cloudflare R2) | Backup contínuo em segundos, restauração simples. Alternativa: rclone diário pra Google Drive. |
| Monitoramento básico | **Uptime Kuma** (self-host) ou **UptimeRobot free** | Alerta por email/WhatsApp se site cair. |

---

## 3. PERGUNTAS A FAZER AO USUÁRIO ANTES DE COMEÇAR

Faça estas perguntas **antes** de executar qualquer comando. Não prossiga até ter resposta de todas:

1. **Já tem domínio comprado?** Qual? (ex: `andynaregua.com.br`). Se não, oriente comprar primeiro.
2. **Já tem VPS contratada?** Qual provedor e IP? Se não, oriente o cadastro (recomende Contabo VPS S).
3. **Tem chave SSH gerada ou usará senha?** Recomende SSH key.
4. **Email pra Let's Encrypt** (notificações de SSL): qual?
5. **Senha pro painel admin** (Basic Auth): peça pra definir agora, mínimo 16 caracteres alfanuméricos.
6. **Conta S3-compatible pra backup**: tem Backblaze B2 ou Cloudflare R2? Se não, oriente criar conta gratuita na Cloudflare R2 (10GB free).
7. **Quer enviar lembretes/notificações pelo número novo já em produção** ou prefere migrar gradualmente (chip de teste por 3 dias primeiro)?

Pergunta extra obrigatória se ele não respondeu antes:

8. Confirma o número WhatsApp definitivo do bot? (Será necessário escanear QR Code uma vez no servidor.)

---

## 4. PARTE 1 — PREPARAÇÃO DA VPS (Ubuntu 24.04)

**CHECKPOINT inicial:** VPS criada com Ubuntu 24.04 LTS, IP público anotado, acesso SSH funcionando.

Conecte via SSH como root, execute na ordem:

```bash
# 4.1 Atualizar sistema
apt update && apt upgrade -y

# 4.2 Criar usuário não-root pra rodar o bot
adduser andybot
usermod -aG sudo andybot
mkdir -p /home/andybot/.ssh
cp ~/.ssh/authorized_keys /home/andybot/.ssh/
chown -R andybot:andybot /home/andybot/.ssh
chmod 700 /home/andybot/.ssh
chmod 600 /home/andybot/.ssh/authorized_keys

# 4.3 Firewall (UFW) — só SSH + HTTP + HTTPS
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 4.4 Hardening básico do SSH
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart ssh

# A partir daqui, conecte como `andybot`, não mais root.
exit
```

Reconecte como `andybot@<IP>`:

```bash
# 4.5 Node.js 24 via nvm (mais flexível que apt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
nvm alias default 24
node -v   # Confirma v24.x

# 4.6 Dependências do Chromium (pra WPPConnect)
sudo apt install -y \
  ca-certificates fonts-liberation libasound2t64 libatk-bridge2.0-0 libatk1.0-0 \
  libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgbm1 libgcc-s1 \
  libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libpangocairo-1.0-0 \
  libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 \
  libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \
  wget xdg-utils libu2f-udev libdrm2 libxkbcommon0

# 4.7 PM2 global
npm install -g pm2

# 4.8 Caddy 2 (reverse proxy + HTTPS automático)
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# 4.9 Git
sudo apt install -y git

# 4.10 sqlite3 cli (pra debug eventual)
sudo apt install -y sqlite3
```

**CHECKPOINT 1:** confirme com `node -v`, `pm2 -v`, `caddy version`, `git --version` — todos devem responder versões. Não prossiga sem isso.

---

## 5. PARTE 2 — DEPLOY DO BOT

### 5.1 Transferir o código

Opção A (recomendada) — **clone via git:**
- Verifique se o projeto está no GitHub/GitLab. Se não, oriente o usuário a criar repo privado e fazer `git push`.
- Na VPS: `git clone <url-do-repo> /home/andybot/chatbot && cd /home/andybot/chatbot`

Opção B — **scp direto** (se não houver repo):
```bash
# Do Windows local (PowerShell):
scp -r C:\Users\pc\Desktop\Projetos\CHATBOT andybot@<IP>:/home/andybot/chatbot
```
⚠️ Antes de copiar pra produção, exclua `node_modules`, `data/chatbot.db*` e `tokens/` (dados de sessão local).

### 5.2 Configurar `.env` em produção

Crie `/home/andybot/chatbot/.env` com:

```env
# Anthropic
ANTHROPIC_API_KEY=...

# Google Calendar (OAuth 2.0)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_CALENDAR_ID_GERAL=...
GOOGLE_CALENDAR_ID_BARBEIRO1=...
GOOGLE_CALENDAR_ID_BARBEIRO2=...
GOOGLE_CALENDAR_ID_BARBEIRO3=...

# OpenAI (Whisper)
OPENAI_API_KEY=...

# WPPConnect
WPP_SESSION=andy-prod

# Express
PORT=21466
NODE_ENV=production

# Painel admin
PANEL_BASE_PATH=/painel-andy-regua-2024
PANEL_BASIC_AUTH_USER=andy
PANEL_BASIC_AUTH_PASS=<senha forte que o usuário definiu>
```

**Importante sobre OAuth do Google:** se o `GOOGLE_REFRESH_TOKEN` foi gerado em desenvolvimento (callback `urn:ietf:wg:oauth:2.0:oob`), continua válido em produção. Não precisa regenerar.

### 5.3 Instalar e validar

```bash
cd /home/andybot/chatbot
npm install --omit=dev
# Roda check rápido antes do PM2:
node --check src/whatsapp.mjs
node --check src/claude.mjs
node --check src/config.mjs
```

### 5.4 Conectar WhatsApp (escanear QR uma única vez)

WPPConnect precisa do QR code escaneado pelo celular do Andy. O QR aparece via página HTTP `http://localhost:21466/qr` no servidor.

**Procedimento:**

1. Em uma sessão SSH, rode em **foreground** uma vez só:
   ```bash
   cd /home/andybot/chatbot
   node demo.mjs
   ```
2. Em outra sessão SSH (paralela), crie um túnel pra ver o QR no seu navegador local:
   ```bash
   # No seu MACHINE LOCAL, em outro terminal:
   ssh -L 21466:localhost:21466 andybot@<IP>
   ```
3. Abra `http://localhost:21466/qr` no seu navegador local.
4. Andy escaneia com WhatsApp do celular dele (Menu → Aparelhos conectados → Conectar um aparelho).
5. Aguarde log `WhatsApp conectado — aguardando mensagens`.
6. Mate o processo (CTRL+C). A sessão fica salva em `tokens/andy-prod/`.

### 5.5 Subir com PM2

```bash
cd /home/andybot/chatbot
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u andybot --hp /home/andybot
# Cole no terminal o comando que o PM2 imprimir (precisa de sudo)
```

Comandos úteis (deixe registrados pro Andy):
```bash
pm2 status              # status atual
pm2 logs --lines 100    # últimas 100 linhas de log
pm2 restart all         # reiniciar tudo
pm2 stop all            # parar tudo
pm2 monit               # monitor em tempo real
```

**CHECKPOINT 2:** `pm2 status` mostra processo `online` e estável por 2 minutos sem reiniciar. Testes funcionais (mande "oi" no WhatsApp): bot responde. Não prossiga sem isso.

---

## 6. PARTE 3 — ACESSO REMOTO AO PAINEL (Caddy + HTTPS)

### 6.1 DNS

No painel do registrador do domínio (Cloudflare, Registro.br, etc), crie:

```
Tipo  Nome            Valor                   Proxy
A     @               <IP da VPS>             OFF (não usar Cloudflare proxy — interfere com Let's Encrypt em alguns casos. Use DNS only)
A     www             <IP da VPS>             OFF
A     painel          <IP da VPS>             OFF
A     agendar         <IP da VPS>             OFF
```

Aguarde propagação (5-30 min). Confirme com `dig +short andynaregua.com.br` no servidor — deve retornar o IP.

### 6.2 Configurar Caddy

Edite `/etc/caddy/Caddyfile`:

```caddyfile
# Landing page de agendamento
agendar.andynaregua.com.br {
  reverse_proxy localhost:21466 {
    header_up X-Forwarded-Host {host}
  }
  encode gzip
}

# Painel admin (com Basic Auth obrigatório)
painel.andynaregua.com.br {
  basicauth {
    andy {bcrypt do PANEL_BASIC_AUTH_PASS}
  }
  reverse_proxy localhost:21466 {
    header_up X-Forwarded-Host {host}
  }
}

# Domínio raiz redireciona pra landing
andynaregua.com.br, www.andynaregua.com.br {
  redir https://agendar.andynaregua.com.br{uri} permanent
}
```

Gere o hash bcrypt da senha do painel:
```bash
caddy hash-password
# Cole a senha → ele retorna o hash → cole no Caddyfile no lugar de {bcrypt do PANEL_BASIC_AUTH_PASS}
```

Aplique:
```bash
sudo systemctl reload caddy
sudo systemctl status caddy   # confirma "active (running)"
journalctl -u caddy -n 50    # checa logs do Caddy
```

**CHECKPOINT 3:** abra no navegador `https://painel.andynaregua.com.br/painel-andy-regua-2024/agenda` — deve pedir usuário/senha do Basic Auth e depois mostrar o painel. Cadeado HTTPS verde. Não prossiga sem isso.

---

## 7. PARTE 4 — LANDING PAGE DE AGENDAMENTO

A landing usa as funções que JÁ EXISTEM em `src/tools.mjs` e `src/calendar.mjs`. Sua tarefa: criar **endpoints HTTP REST** no `panel.mjs` e **frontend simples** servido em `/agendar`.

### 7.1 Endpoints novos no `src/panel.mjs`

Adicione (mantendo os endpoints admin existentes):

```javascript
// ========== API PÚBLICA DE AGENDAMENTO ==========
// Todos os endpoints abaixo são SEM autenticação — usados pela landing.

// GET /api/servicos — lista de serviços
app.get('/api/servicos', (req, res) => {
  res.json({ servicos: services.map(s => ({
    id: s.id, name: s.name, price: s.price, durationMinutes: s.durationMinutes, category: s.category
  }))})
})

// GET /api/barbeiros — lista de barbeiros ativos
app.get('/api/barbeiros', (req, res) => {
  res.json({ barbeiros: staff.filter(s => s.active).map(s => ({ id: s.id, name: s.name }))})
})

// GET /api/disponibilidade?data=2026-05-23&servico_id=corte&staff_id=qualquer
app.get('/api/disponibilidade', async (req, res) => {
  try {
    const { data, servico_id, staff_id = 'qualquer' } = req.query
    if (!data || !servico_id) return res.status(400).json({ erro: 'parâmetros faltando' })
    const servico = services.find(s => s.id === servico_id)
    if (!servico) return res.status(400).json({ erro: 'serviço inválido' })

    if (staff_id === 'qualquer') {
      const slots = await getNextAvailableAcrossStaff(data, servico.durationMinutes)
      return res.json({ slots })
    } else {
      const slots = await findFreeSlots(staff_id, data, servico.durationMinutes)
      const member = staff.find(s => s.id === staff_id)
      return res.json({ slots: slots.map(sl => ({ ...sl, staffId: staff_id, staffName: member?.name })) })
    }
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// POST /api/agendar  body: { nome, whatsapp, servico_id, staff_id, start_iso }
app.post('/api/agendar', async (req, res) => {
  try {
    const { nome, whatsapp, servico_id, staff_id, start_iso } = req.body
    if (!nome || !whatsapp || !servico_id || !staff_id || !start_iso) {
      return res.status(400).json({ erro: 'campos obrigatórios faltando' })
    }
    // Normaliza whatsapp pra formato @c.us
    const numeroLimpo = whatsapp.replace(/\D/g, '')
    if (numeroLimpo.length < 10 || numeroLimpo.length > 13) {
      return res.status(400).json({ erro: 'whatsapp inválido' })
    }
    const wppNumber = numeroLimpo.startsWith('55') ? `${numeroLimpo}@c.us` : `55${numeroLimpo}@c.us`

    // Reusa a função existente
    const resultado = await criarAgendamentoTool({
      whatsapp_number: wppNumber,
      cliente_nome: nome,
      staff_id, servico_id, start_iso
    })

    if (!resultado?.sucesso) {
      return res.status(409).json({ erro: resultado?.erro || 'horário não disponível' })
    }

    // Dispara mensagem WhatsApp de confirmação (via fila)
    const msgConfirma = `✂️ Agendamento confirmado na Andy Na Régua!\n\n${resultado.servico_nome}\n${resultado.data_label} às ${resultado.hora_label}\nBarbeiro: ${resultado.staff_nome}\n\nEndereço: Rua 900, nº 41 (Antigo China Center) — Balneário Camboriú\n\nAté lá! 👊`
    enfileirarMensagem(wppNumber, msgConfirma, 'critica')

    res.json({ sucesso: true, agendamento: resultado })
  } catch (err) {
    res.status(500).json({ erro: err.message })
  }
})

// GET /agendar — serve a landing page
app.get('/agendar', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/agendar.html'))
})
app.use('/agendar/assets', express.static(path.join(__dirname, '../public/assets')))
```

Imports necessários no topo: `services`, `staff` do `config.mjs`; `findFreeSlots`, `getNextAvailableAcrossStaff` do `calendar.mjs`; `criarAgendamentoTool` do `tools.mjs`; `enfileirarMensagem` do `db.mjs`; `path` e `__dirname` resolvido para ESM:

```javascript
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
```

### 7.2 Frontend `public/agendar.html`

Crie a pasta `public/` na raiz do projeto e dentro o arquivo `agendar.html`. Estrutura obrigatória:

**Stack:**
- Tailwind CSS via CDN (`https://cdn.tailwindcss.com`)
- Alpine.js v3 via CDN
- Sem build, sem npm
- Mobile-first (UI testada em viewport 360px)

**Fluxo UX (4 telas):**

1. **Tela 1 — Escolher serviço**: grid de cards com nome, preço, duração. Categorias agrupadas (Cabelo, Barba, Estética).
2. **Tela 2 — Escolher barbeiro**: lista com fotos placeholder + opção "Qualquer barbeiro disponível" (recomendada). Cada barbeiro mostra nome e estilo (placeholder por enquanto).
3. **Tela 3 — Escolher data e horário**: calendário do mês corrente + slots disponíveis abaixo. Cada slot é um botão tappable. Vermelho = ocupado (não mostra), Verde = livre. Mostra 7 dias úteis à frente. **Bloqueia domingo.**
4. **Tela 4 — Dados do cliente**: form com nome (obrigatório), WhatsApp (obrigatório, máscara brasileira `(47) 99999-9999`). Validação client-side: WhatsApp tem que ter 10 ou 11 dígitos + DDD. Botão "Confirmar agendamento" grande.
5. **Tela 5 — Confirmação**: ✅ ícone grande, resumo do agendamento, frase "Mandamos a confirmação no seu WhatsApp também", botão "Fazer outro agendamento" (volta tela 1) e "Ver no mapa" (link Google Maps endereço).

**Design system obrigatório:**
- Cores: fundo `#0a0a0a` (preto), card `#1a1a1a`, texto `#fafafa`, accent dourado `#d4af37` (mesmo da identidade Andy Na Régua atual no painel).
- Font: `Inter` via Google Fonts.
- Bordas arredondadas `rounded-2xl`. Sombras sutis.
- Botões grandes (mínimo 48px altura — touch target).
- Header fixo no topo com logo "Andy Na Régua" + ícone ✂️.
- Footer fixo com endereço + Instagram.
- Transições suaves entre telas (Alpine `x-transition`).

**Estado em Alpine.js:**
```js
Alpine.data('agendamento', () => ({
  passo: 1,                        // 1..5
  servicos: [], barbeiros: [], slots: [],
  servicoEscolhido: null,
  barbeiroEscolhido: null,         // null = "qualquer"
  dataEscolhida: null,
  slotEscolhido: null,
  nome: '', whatsapp: '',
  enviando: false, erro: null,

  async init() {
    const [s, b] = await Promise.all([
      fetch('/api/servicos').then(r => r.json()),
      fetch('/api/barbeiros').then(r => r.json()),
    ])
    this.servicos = s.servicos
    this.barbeiros = b.barbeiros
  },

  async carregarSlots() {
    if (!this.servicoEscolhido || !this.dataEscolhida) return
    this.slots = []
    const url = `/api/disponibilidade?data=${this.dataEscolhida}&servico_id=${this.servicoEscolhido.id}&staff_id=${this.barbeiroEscolhido?.id || 'qualquer'}`
    const r = await fetch(url).then(r => r.json())
    this.slots = r.slots || []
  },

  async confirmar() {
    this.enviando = true; this.erro = null
    try {
      const body = {
        nome: this.nome,
        whatsapp: this.whatsapp.replace(/\D/g,''),
        servico_id: this.servicoEscolhido.id,
        staff_id: this.slotEscolhido.staffId,
        start_iso: this.slotEscolhido.start,
      }
      const r = await fetch('/api/agendar', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) })
      const d = await r.json()
      if (!r.ok) throw new Error(d.erro || 'erro')
      this.passo = 5
    } catch (e) {
      this.erro = e.message
    } finally { this.enviando = false }
  },

  reset() {
    this.passo = 1
    this.servicoEscolhido = this.barbeiroEscolhido = this.dataEscolhida = this.slotEscolhido = null
    this.nome = this.whatsapp = ''; this.erro = null
  }
}))
```

### 7.3 Garantias de sincronização

Como ambos os canais (WhatsApp e landing) usam a **mesma função** `criarAgendamentoTool` que **sempre** chama `isSlotAvailable` antes de criar, **conflito é impossível**: o último a chamar vai receber `{ sucesso: false, erro: 'horário ocupado' }` e a landing mostra "Ih, esse horário acabou de ser preenchido. Tem outros disponíveis logo abaixo".

O Calendar é a **single source of truth**. O painel admin já mostra agendamentos de ambos os canais misturados.

**CHECKPOINT 4:** abrir `https://agendar.andynaregua.com.br/agendar` no celular → completar fluxo até confirmar → receber mensagem no WhatsApp do número que foi digitado → ver agendamento no painel admin. Testar conflito: agendar 10h via landing, mandar mensagem no WhatsApp pedindo o mesmo 10h, bot deve recusar.

---

## 8. PARTE 5 — BACKUP + MONITORAMENTO

### 8.1 Backup contínuo do SQLite via Litestream

Litestream replica o banco em tempo real pra S3-compatible. Restauração = `litestream restore`. Zero perda de dados.

```bash
# Install
wget https://github.com/benbjohnson/litestream/releases/download/v0.3.13/litestream-v0.3.13-linux-amd64.deb
sudo dpkg -i litestream-v0.3.13-linux-amd64.deb

# Config: /etc/litestream.yml
sudo nano /etc/litestream.yml
```

Conteúdo do `/etc/litestream.yml`:
```yaml
dbs:
  - path: /home/andybot/chatbot/data/chatbot.db
    replicas:
      - type: s3
        endpoint: <endpoint do R2 ou B2>
        bucket: andy-chatbot-backup
        path: chatbot.db
        access-key-id: <KEY>
        secret-access-key: <SECRET>
        retention: 720h    # 30 dias
```

Ativar serviço:
```bash
sudo systemctl enable litestream
sudo systemctl start litestream
sudo systemctl status litestream
```

### 8.2 Monitoramento de uptime

**Opção A — UptimeRobot (grátis, externo):**
- Cadastre 2 monitors HTTPS:
  - `https://agendar.andynaregua.com.br/agendar` (status 200)
  - `https://painel.andynaregua.com.br/painel-andy-regua-2024/agenda` (status 401 esperado por causa do Basic Auth — configure como "Keyword exists: WWW-Authenticate")
- Alerta por email + opcional Telegram/Discord.

**Opção B — Uptime Kuma (self-host, mais bonito):**
```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```
E aponta um subdomínio `status.andynaregua.com.br` no Caddyfile.

### 8.3 Renovação automática

- **Caddy** renova SSL automaticamente (Let's Encrypt). Nada a fazer.
- **Litestream** roda como systemd service, restart automático.
- **PM2** com `pm2 startup` configurado roda no boot.

**CHECKPOINT 5:** reiniciar a VPS (`sudo reboot`), aguardar 1 minuto, e confirmar:
- Bot responde no WhatsApp ✓
- Painel acessível via HTTPS ✓
- Landing funciona ✓
- `pm2 status` mostra `online` ✓
- `systemctl status caddy litestream` ambos `active` ✓

---

## 9. PARTE 6 — CHECKLIST PRÉ-PRODUÇÃO

Antes de liberar pro Andy operar:

- [ ] Domínio resolve corretamente (`dig +short`)
- [ ] HTTPS funcionando com cadeado verde em todos os subdomínios
- [ ] Painel admin protegido com Basic Auth — testar entrar com senha errada (deve falhar)
- [ ] WhatsApp conectado e responde "oi" com tom correto
- [ ] Test agendamento WhatsApp → cria no Calendar → aparece no painel
- [ ] Test agendamento landing → cria no Calendar → aparece no painel → cliente recebe msg de confirmação
- [ ] Test conflito: 2 canais tentando mesmo slot → 1 sucesso, 1 rejeitado
- [ ] Backup Litestream rodando (verificar bucket S3 tem arquivos)
- [ ] UptimeRobot monitorando
- [ ] PM2 logs sem erros recorrentes nos últimos 5 minutos
- [ ] Configurações no painel preenchidas: `chave_pix_sinal`, `google_review_link`, `andy_phone`, `horario_abertura`, `horario_fechamento`, etc.
- [ ] Nomes reais dos barbeiros em `src/config.mjs` substituindo placeholders
- [ ] `.env` permissão 600 (`chmod 600 /home/andybot/chatbot/.env`)
- [ ] `tokens/` permissão 700
- [ ] Firewall UFW ativo (`sudo ufw status`)
- [ ] SSH root login DESATIVADO
- [ ] Password auth do SSH DESATIVADO (só key)
- [ ] `pm2 save` executado pra persistir lista de processos

---

## 10. PARTE 7 — ENTREGA AO ANDY (documentação operacional)

Crie no projeto um arquivo `OPERACAO.md` com isso (linguagem simples, sem jargão):

```markdown
# Como operar o sistema Andy Na Régua

## Acessar o painel
- URL: https://painel.andynaregua.com.br/painel-andy-regua-2024/agenda
- Usuário: andy
- Senha: <senha>

## Landing pública (pra divulgar)
- URL: https://agendar.andynaregua.com.br/agendar
- Compartilhe esse link no Instagram, cartão, panfleto, etc.

## Reiniciar o bot (se algo travar)
SSH na VPS e rode:
\`\`\`
pm2 restart all
\`\`\`

## Ver logs do bot agora
\`\`\`
pm2 logs --lines 50
\`\`\`

## Bot caiu ou WhatsApp desconectou
1. Abrir https://painel.andynaregua.com.br/painel-andy-regua-2024/agenda
2. Se o cadeado/status disser "offline" no rodapé, SSH na VPS:
   \`\`\`
   pm2 logs --lines 100
   \`\`\`
   Procure mensagem "Authenticated" ou "Initializing".
3. Se precisar reescanar o QR Code (raro, só se WhatsApp desconectar 100%):
   \`\`\`
   pm2 stop all
   ssh -L 21466:localhost:21466 andybot@<IP>
   # em outra janela:
   cd /home/andybot/chatbot && node demo.mjs
   # abrir http://localhost:21466/qr no navegador local e escanear
   # quando aparecer "WhatsApp conectado", CTRL+C e:
   pm2 start ecosystem.config.cjs
   \`\`\`

## Trocar a chave Pix, link do Google review, etc.
- Acesse o painel → menu "Config"
- Edite o campo
- Salvar — efeito imediato, não precisa reiniciar nada

## Backup
- Automático, contínuo. Litestream replica pra Cloudflare R2 a cada segundo.
- Pra restaurar (emergência), me chama.

## Custos mensais aproximados
- VPS Contabo: €5 (~R$30)
- Domínio: ~R$3 (R$40/ano)
- Cloudflare R2: grátis até 10GB
- Anthropic API (Claude): ~$2-5/mês com tráfego atual
- TOTAL: ~R$35-50/mês

## Quando me chamar (desenvolvedor)
- Bot respondendo errado de forma consistente
- Mensagens não chegando
- Painel não abre
- Adicionar/remover barbeiro
- Mudança grande de regra de negócio
- Restaurar backup
```

---

## 11. RESUMO DAS RESPOSTAS QUE VOCÊ DEVE DAR AO USUÁRIO DURANTE A EXECUÇÃO

Em cada **CHECKPOINT** (1 a 5), pause e reporte com este formato:

```
═══ CHECKPOINT N concluído ═══
✅ <item validado>
✅ <item validado>
⚠️ <warning se houver, mas que não bloqueia>
❌ <bloqueio se houver>

PRÓXIMO PASSO: <descrição clara>
AGUARDANDO: <ação do usuário se necessária, ex: confirmação, dado faltante>
```

E ao final de tudo:

```
═══ DEPLOY FINALIZADO ═══

URLs públicas:
- Landing: https://agendar.andynaregua.com.br/agendar
- Painel:  https://painel.andynaregua.com.br/painel-andy-regua-2024/agenda

Custo mensal estimado: ~R$35-50

Documentação operacional: /home/andybot/chatbot/OPERACAO.md

Próximas ações sugeridas:
1. Trocar nomes reais dos barbeiros em src/config.mjs
2. Preencher chave Pix e link review Google pelo painel /config
3. Divulgar o link da landing no Instagram da barbearia
4. Configurar UptimeRobot pra avisar se cair
```

---

## 12. O QUE NÃO FAZER

- **Não** instalar Chromium via `apt install chromium-browser` — WPPConnect baixa o próprio. Só precisa das libs (passo 4.6).
- **Não** usar nginx — Caddy é mais simples e o plano todo assume ele.
- **Não** rodar como root — sempre usuário `andybot`.
- **Não** expor a porta 21466 publicamente — só Caddy fala com ela via `localhost`.
- **Não** commitar `.env` no git. Confirme que `.gitignore` cobre isso.
- **Não** usar Docker pro bot principal — overhead de Chromium em container é alto e complica troubleshooting. O `uptime-kuma` em Docker é OK porque é isolado.
- **Não** mexer no `whatsapp.mjs`, `claude.mjs`, `tools.mjs` exceto pelo que esse plano pede.
- **Não** prometer SLA — sistema é robusto mas tem dependências externas (Anthropic, Google, Meta).

---

**Boa execução. Reporte em cada checkpoint. Sem improviso fora do plano.**

# ╔══════════════════════════════════════════════════════════════╗
# ║   ANDY NA REGUA — Script de inicializacao completo          ║
# ║   Uso: .\iniciar.ps1                                         ║
# ║   O que faz:                                                 ║
# ║   1. Mata processos antigos na porta 21466                   ║
# ║   2. Sobe o bot em background                                ║
# ║   3. Abre tunel Cloudflare                                   ║
# ║   4. Atualiza config.js com a nova URL                       ║
# ║   5. Faz deploy no Vercel automaticamente                    ║
# ║   6. Exibe todos os links de acesso                          ║
# ╚══════════════════════════════════════════════════════════════╝

param(
  [string]$VercelOrigin = "https://bot-andy.vercel.app",
  [int]$Port = 21466,
  [switch]$SemVercel
)

$ErrorActionPreference = "Stop"
# $PSScriptRoot e a pasta onde o script esta (CHATBOT/)
$Root = $PSScriptRoot
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  # Fallback: tentar o diretorio atual
  $Root = (Get-Location).Path
}
if (-not (Test-Path (Join-Path $Root "package.json"))) {
  Write-Host "ERRO: nao encontrei package.json em $Root" -ForegroundColor Red
  exit 1
}
Set-Location $Root

$RED    = "Red"
$GREEN  = "Green"
$CYAN   = "Cyan"
$YELLOW = "Yellow"
$WHITE  = "White"

function Titulo($msg) {
  Write-Host ""
  Write-Host "  $msg" -ForegroundColor $CYAN
  Write-Host "  $("─" * ($msg.Length))" -ForegroundColor DarkGray
}

function OK($msg)   { Write-Host "  ✓ $msg" -ForegroundColor $GREEN }
function ERR($msg)  { Write-Host "  ✗ $msg" -ForegroundColor $RED }
function INFO($msg) { Write-Host "  → $msg" -ForegroundColor $YELLOW }
function LINK($msg) { Write-Host "    $msg" -ForegroundColor $WHITE }

# ── Banner ──────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ╔══════════════════════════════════╗" -ForegroundColor DarkRed
Write-Host "  ║    Andy Na Regua — Inicializando ║" -ForegroundColor DarkRed
Write-Host "  ╚══════════════════════════════════╝" -ForegroundColor DarkRed
Write-Host ""

# ── Passo 1: Matar processo antigo na porta ──────────────────────
Titulo "1. Limpando porta $Port"
try {
  $pids = (netstat -ano | Select-String ":${Port}.*LISTENING" | ForEach-Object {
    ($_ -split '\s+')[-1]
  } | Select-Object -Unique)
  if ($pids) {
    foreach ($pid in $pids) {
      Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    OK "Processo antigo encerrado (PID: $($pids -join ', '))"
    Start-Sleep -Seconds 1
  } else {
    OK "Porta $Port ja esta livre"
  }
} catch {
  INFO "Nenhum processo para encerrar"
}

# ── Passo 2: Subir o bot em nova janela ──────────────────────────
Titulo "2. Subindo o bot"
$botLog = Join-Path $env:TEMP "andy-bot.log"
if (Test-Path $botLog) { Remove-Item $botLog -Force }

$botProcess = Start-Process powershell -ArgumentList @(
  "-NoProfile",
  "-NoExit",
  "-Command",
  "cd '$Root'; Write-Host 'BOT ANDY NA REGUA' -ForegroundColor Red; npm start 2>&1 | Tee-Object -FilePath '$botLog' -Append"
) -PassThru -WindowStyle Normal

INFO "Bot iniciando em nova janela (PID: $($botProcess.Id))..."

# Aguardar o servidor responder (max 30s)
$deadline = (Get-Date).AddSeconds(30)
$botOk = $false
while ((Get-Date) -lt $deadline -and -not $botOk) {
  Start-Sleep -Seconds 2
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
    $botOk = $true
  } catch { }
}

if ($botOk) {
  OK "Bot respondendo em http://localhost:$Port"
} else {
  ERR "Bot nao respondeu em 30s. Verifique a janela do terminal."
  ERR "Verifique se ANTHROPIC_API_KEY esta definida no .env"
  Write-Host ""
  Write-Host "  Pressione Enter para continuar mesmo assim ou Ctrl+C para cancelar..."
  $null = Read-Host
}

# ── Passo 3: Abrir tunel Cloudflare ─────────────────────────────
Titulo "3. Abrindo tunel Cloudflare"
$tunnelLog = Join-Path $env:TEMP "andy-tunnel.log"
if (Test-Path $tunnelLog) { Remove-Item $tunnelLog -Force }

$tunnelJob = Start-Job -ScriptBlock {
  param($Port, $Log, $Dir)
  Set-Location $Dir
  & npx --yes cloudflared@latest tunnel --url "http://127.0.0.1:$Port" *>&1 |
    Out-File -FilePath $Log -Encoding utf8 -Append
} -ArgumentList $Port, $tunnelLog, $Root

INFO "Aguardando URL do tunel (ate 90s)..."

$tunnelUrl = $null
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline -and -not $tunnelUrl) {
  Start-Sleep -Seconds 2
  if (Test-Path $tunnelLog) {
    $logContent = Get-Content $tunnelLog -Raw -ErrorAction SilentlyContinue
    if ($logContent -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
      $tunnelUrl = $Matches[1].TrimEnd('/')
    }
  }
}

if (-not $tunnelUrl) {
  ERR "Nao foi possivel obter URL do tunel."
  ERR "Log em: $tunnelLog"
  Stop-Job $tunnelJob -ErrorAction SilentlyContinue
  exit 1
}

OK "Tunel ativo: $tunnelUrl"

# ── Passo 4: Atualizar config.js ─────────────────────────────────
Titulo "4. Atualizando config.js"
$configJs = Join-Path $Root "public\config.js"
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$configContent = @"
/** Atualizado em $timestamp por iniciar.ps1 */
window.__API_BASE__ = '$tunnelUrl'
window.__VERCEL_ORIGIN__ = '$VercelOrigin'
"@
Set-Content -Path $configJs -Value $configContent -Encoding UTF8
OK "public/config.js -> $tunnelUrl"

# Atualizar tambem BOOKING_API_BASE no .env
$envPath = Join-Path $Root ".env"
if (Test-Path $envPath) {
  $envContent = Get-Content $envPath -Raw
  if ($envContent -match 'BOOKING_API_BASE=') {
    $envContent = $envContent -replace 'BOOKING_API_BASE=.*', "BOOKING_API_BASE=$tunnelUrl"
  } else {
    $envContent = $envContent.TrimEnd() + "`nBOOKING_API_BASE=$tunnelUrl`n"
  }
  # Escrever via arquivo temporario para evitar conflito com o bot
  $tmpEnv = $envPath + ".tmp"
  [System.IO.File]::WriteAllText($tmpEnv, $envContent, [System.Text.Encoding]::UTF8)
  Move-Item -Path $tmpEnv -Destination $envPath -Force
  OK ".env -> BOOKING_API_BASE atualizado"
}

# ── Passo 5: Testar API via tunel ───────────────────────────────
Titulo "5. Testando API via tunel"
Start-Sleep -Seconds 3
try {
  $headers = @{ "ngrok-skip-browser-warning" = "true" }
  $test = Invoke-RestMethod -Uri "$tunnelUrl/api/servicos" -Headers $headers -TimeoutSec 15
  $n = @($test.servicos).Count
  OK "GET /api/servicos -> $n servicos"
} catch {
  INFO "Aviso: teste da API falhou ($($_.Exception.Message))"
  INFO "O CORS pode precisar de um restart do bot apos mudar o .env"
}

# ── Passo 6: Deploy Vercel ────────────────────────────────────────
if (-not $SemVercel) {
  Titulo "6. Deploy no Vercel"
  INFO "Fazendo deploy do config.js atualizado..."
  try {
    $vercelOutput = & npx vercel --prod --yes 2>&1 | Out-String
    if ($vercelOutput -match 'Production: (https://[^\s]+)') {
      $vercelUrl = $Matches[1]
      OK "Deploy concluido: $vercelUrl"
    } elseif ($vercelOutput -match 'Error') {
      INFO "Vercel retornou aviso. Output:"
      Write-Host $vercelOutput -ForegroundColor DarkGray
    } else {
      OK "Deploy concluido"
    }
  } catch {
    INFO "Vercel CLI nao encontrado ou erro: $($_.Exception.Message)"
    INFO "Rode manualmente: npx vercel --prod"
  }
} else {
  Titulo "6. Deploy Vercel (pulado)"
  INFO "Use -SemVercel para pular. Rode manualmente: npx vercel --prod"
}

# ── Resumo final ─────────────────────────────────────────────────
Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════════════╗" -ForegroundColor DarkGreen
Write-Host "  ║                  SISTEMA NO AR                      ║" -ForegroundColor DarkGreen
Write-Host "  ╚══════════════════════════════════════════════════════╝" -ForegroundColor DarkGreen
Write-Host ""
Write-Host "  PAINEL ADMIN" -ForegroundColor $CYAN
LINK "http://localhost:$Port/painel-andy-regua-2024/agenda"
Write-Host ""
Write-Host "  KANBAN RECEPCAO" -ForegroundColor $CYAN
LINK "http://localhost:$Port/recepcao-andy-regua-2024/kanban"
Write-Host ""
Write-Host "  PAINEL BARBEIRO" -ForegroundColor $CYAN
LINK "http://localhost:$Port/painel/login"
Write-Host ""
Write-Host "  AGENDAMENTO ONLINE (clientes)" -ForegroundColor $CYAN
LINK "$VercelOrigin"
Write-Host ""
Write-Host "  API (tunel publico)" -ForegroundColor $CYAN
LINK "$tunnelUrl"
Write-Host ""
Write-Host "  TUNEL URL (para variaveis de ambiente)" -ForegroundColor $YELLOW
LINK "BOOKING_API_BASE=$tunnelUrl"
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Mantenha esta janela aberta (tunel ativo enquanto rodar)" -ForegroundColor DarkGray
Write-Host "  Para parar tudo: Ctrl+C" -ForegroundColor DarkGray
Write-Host ""

# Manter tunel rodando em foreground
Receive-Job $tunnelJob -Wait

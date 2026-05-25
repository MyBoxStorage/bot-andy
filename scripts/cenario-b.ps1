# Cenario B: bot local + tunel HTTPS + landing Vercel
# Uso: .\scripts\cenario-b.ps1 [-VercelOrigin "https://andy-na-regua.vercel.app"]
param(
  [string]$VercelOrigin = "https://andy-na-regua.vercel.app",
  [int]$Port = 21466
)

$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $Root

$VercelOrigin = $VercelOrigin.TrimEnd("/")
$ConfigJs = Join-Path $Root "public\config.js"
$EnvFile = Join-Path $Root ".env"

Write-Host ""
Write-Host "=== Cenario B: tunel + config para Vercel ===" -ForegroundColor Cyan
Write-Host "Origem Vercel (CORS): $VercelOrigin"
Write-Host ""

# 1) Atualizar PUBLIC_BOOKING_ORIGINS no .env
if (Test-Path $EnvFile) {
  $envLines = Get-Content $EnvFile -Raw
  if ($envLines -match '(?m)^PUBLIC_BOOKING_ORIGINS=') {
    $envLines = $envLines -replace '(?m)^PUBLIC_BOOKING_ORIGINS=.*', "PUBLIC_BOOKING_ORIGINS=$VercelOrigin"
  } else {
    $envLines = $envLines.TrimEnd() + "`nPUBLIC_BOOKING_ORIGINS=$VercelOrigin`n"
  }
  Set-Content -Path $EnvFile -Value $envLines -NoNewline -Encoding UTF8
  Write-Host "[ok] .env -> PUBLIC_BOOKING_ORIGINS=$VercelOrigin" -ForegroundColor Green
} else {
  Write-Host "[!] .env nao encontrado. Crie a partir de .env.example" -ForegroundColor Yellow
}

# 2) Verificar se o bot responde
try {
  $null = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 2
  Write-Host "[ok] Bot respondendo em http://127.0.0.1:$Port" -ForegroundColor Green
} catch {
  Write-Host "[!] Bot NAO esta rodando na porta $Port" -ForegroundColor Yellow
  Write-Host "    Abra outro terminal e rode: npm start" -ForegroundColor Yellow
  Write-Host ""
}

# 3) Iniciar tunel cloudflared (via npx)
Write-Host ""
Write-Host "Iniciando tunel Cloudflare (quick tunnel)..." -ForegroundColor Cyan
Write-Host "Mantenha esta janela aberta durante a demo." -ForegroundColor Gray
Write-Host ""

$logFile = Join-Path $env:TEMP "andy-tunnel.log"
if (Test-Path $logFile) { Remove-Item $logFile -Force }

$tunnelJob = Start-Job -ScriptBlock {
  param($Port, $Log, $RootDir)
  Set-Location $RootDir
  & npx --yes cloudflared@latest tunnel --url "http://127.0.0.1:$Port" *>&1 | Out-File -FilePath $Log -Encoding utf8 -Append
} -ArgumentList $Port, $logFile, $Root

$tunnelUrl = $null
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline -and -not $tunnelUrl) {
  Start-Sleep -Seconds 2
  if (Test-Path $logFile) {
    $log = Get-Content $logFile -Raw -ErrorAction SilentlyContinue
    if ($log -match '(https://[a-z0-9-]+\.trycloudflare\.com)') {
      $tunnelUrl = $Matches[1]
    }
  }
}

if (-not $tunnelUrl) {
  Write-Host "[erro] Nao foi possivel obter URL do tunel em 90s." -ForegroundColor Red
  Write-Host "Log: $logFile"
  Stop-Job $tunnelJob -ErrorAction SilentlyContinue
  exit 1
}

$tunnelUrl = $tunnelUrl.TrimEnd("/")
Write-Host "[ok] Tunel publico: $tunnelUrl" -ForegroundColor Green

# 4) Gravar config.js para proximo deploy Vercel (sem here-string para evitar bug de parser)
$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
$linhas = @()
$linhas += "/** Atualizado em $timestamp por scripts/cenario-b.ps1 */"
$linhas += "window.__API_BASE__ = '$tunnelUrl'"
$linhas += "window.__VERCEL_ORIGIN__ = '$VercelOrigin'"
Set-Content -Path $ConfigJs -Value ($linhas -join "`n") -Encoding UTF8
Write-Host "[ok] public/config.js atualizado" -ForegroundColor Green

# 5) Teste rapido da API via tunel
try {
  $test = Invoke-RestMethod -Uri "$tunnelUrl/api/servicos" -TimeoutSec 15
  $n = @($test.servicos).Count
  Write-Host "[ok] API /api/servicos -> $n servicos" -ForegroundColor Green
} catch {
  Write-Host "[!] API via tunel falhou (reinicie o bot apos mudar .env): $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========== PROXIMOS PASSOS ==========" -ForegroundColor Cyan
Write-Host "1. Se mudou .env, reinicie o bot: Ctrl+C no npm start -> npm start"
Write-Host "2. Deploy Vercel (uma vez por URL de tunel nova):"
Write-Host "   npx vercel --prod"
Write-Host "   OU no painel Vercel defina BOOKING_API_BASE = $tunnelUrl"
Write-Host "3. Abra no celular: $VercelOrigin/agendar"
Write-Host "4. Mostre o painel: http://127.0.0.1:$Port/painel-andy-regua-2024/agenda"
Write-Host "5. Tunel ativo nesta janela - nao feche ate acabar a demo"
Write-Host ""
Write-Host "Variavel Vercel (recomendado): BOOKING_API_BASE = $tunnelUrl"
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Manter tunel rodando em foreground (trazer job output)
Receive-Job $tunnelJob -Wait

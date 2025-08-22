# PowerShell script to run Electron avoiding Cursor association
Write-Host "🚀 Iniciando GPTWhats no Electron..." -ForegroundColor Green

# Change to project directory
Set-Location $PSScriptRoot

# Check if Electron exists
$electronPath = ".\node_modules\.bin\electron.cmd"
if (-not (Test-Path $electronPath)) {
    Write-Host "❌ Electron não encontrado. Instalando dependências..." -ForegroundColor Red
    npm install
}

# Check if server is running
Write-Host "⏳ Verificando servidor na porta 3001..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001" -TimeoutSec 2 -UseBasicParsing
    Write-Host "✅ Servidor está rodando" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Servidor não está rodando. Inicie com: npm start" -ForegroundColor Yellow
}

# Run Electron with full path
Write-Host "🖥️ Abrindo GPTWhats..." -ForegroundColor Cyan
& $electronPath "."

Write-Host "Electron iniciado!" -ForegroundColor Green
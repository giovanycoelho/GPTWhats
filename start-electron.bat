@echo off
echo Iniciando GPTWhats no Electron...
echo.

REM Ir para o diretório do projeto
cd /d "%~dp0"

REM Verificar se o Electron está instalado
if not exist "node_modules\.bin\electron.cmd" (
    echo ❌ Electron não encontrado. Instalando dependências...
    npm install
)

REM Verificar se o servidor está rodando
echo ⏳ Verificando se o servidor está rodando na porta 3001...
netstat -an | find "3001" >nul
if errorlevel 1 (
    echo ⚠️ Servidor não está rodando. Iniciando...
    start "GPTWhats Server" cmd /c "npm start"
    echo ⏳ Aguardando servidor inicializar...
    timeout /t 5 >nul
)

REM Iniciar o Electron usando o caminho completo para evitar conflitos
echo 🚀 Abrindo GPTWhats no Electron...
echo Tentando iniciar com caminho completo...
if exist "node_modules\.bin\electron.cmd" (
    echo ✅ Usando electron.cmd local
    "node_modules\.bin\electron.cmd" .
) else if exist "node_modules\electron\dist\electron.exe" (
    echo ✅ Usando electron.exe local
    "node_modules\electron\dist\electron.exe" .
) else (
    echo ⚠️ Tentando com npx...
    npx --no-install electron .
)

pause
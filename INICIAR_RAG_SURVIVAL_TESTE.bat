@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title RAG SURVIVAL - TESTE (local + Cloudflare)

rem ===================================================================
rem  RAG SURVIVAL - ambiente de TESTE
rem  - Roda NESTA pasta, com dados proprios em .\dados-teste (separado da producao
rem    e de qualquer outra copia do jogo no computador).
rem  - Porta local de teste: 3101 (a producao no Railway nao e tocada).
rem  - Servidor ouve so em 127.0.0.1: os amigos entram pelo link do Cloudflare.
rem  - Multiplayer a 60 TPS / 20 snapshots por segundo (iguais a producao).
rem ===================================================================

if not defined RAG_TEST_PORT set "RAG_TEST_PORT=3101"
set "PORT=%RAG_TEST_PORT%"
set "HOST=127.0.0.1"
set "DATA_DIR=%~dp0dados-teste"
set "TICK_RATE=60"
set "SNAPSHOT_RATE=20"
set "TRUST_PROXY=1"
set "MIDGARD_AUTO_UPDATE=0"
set "LOGS=%~dp0logs-teste"
if not exist "%DATA_DIR%" mkdir "%DATA_DIR%"
if not exist "%LOGS%" mkdir "%LOGS%"

rem --- 1. Node.js 22.13+ -------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale a versao 22 LTS em https://nodejs.org/ e rode de novo.
  pause & exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)"
if errorlevel 1 (
  for /f %%v in ('node -v') do echo [ERRO] Node.js %%v e antigo. Precisa da versao 22.13 ou mais nova.
  pause & exit /b 1
)
rem O jogo nao usa dependencias do npm (so modulos do proprio Node), entao nao ha "npm install".

rem --- 2. chave do painel admin.html (gerada uma vez, fica so nesta pasta) ---
if not exist "%DATA_DIR%\admin_token.txt" node -e "require('fs').writeFileSync(process.argv[1],require('crypto').randomBytes(24).toString('hex'))" "%DATA_DIR%\admin_token.txt"
set /p ADMIN_TOKEN=<"%DATA_DIR%\admin_token.txt"

rem --- 3. servidor do jogo ----------------------------------------------
node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/version').then(r=>r.json()).then(v=>process.exit(v.name==='RAG SURVIVAL'?3:2)).catch(()=>process.exit(1))"
if errorlevel 3 (
  echo O servidor de teste ja esta rodando na porta %PORT%.
  goto tunnel
)
if errorlevel 2 (
  echo [ERRO] A porta %PORT% esta ocupada por outro programa. Feche-o ou rode: set RAG_TEST_PORT=3102 ^& INICIAR_RAG_SURVIVAL_TESTE.bat
  pause & exit /b 2
)
echo Iniciando o servidor de teste... (log: logs-teste\servidor.log)
start "RAG SURVIVAL TESTE - servidor" /min cmd /c "node server.mjs >> "%LOGS%\servidor.log" 2>&1"
set /a tries=0
:wait_server
timeout /t 1 /nobreak >nul
node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
if not errorlevel 1 goto server_ok
set /a tries+=1
if %tries% lss 20 goto wait_server
echo [ERRO] O servidor nao respondeu. Veja o final de logs-teste\servidor.log:
powershell -NoProfile -Command "Get-Content -Tail 20 '%LOGS%\servidor.log'"
pause & exit /b 3
:server_ok
echo [OK] Servidor de teste: http://localhost:%PORT%/

:tunnel
rem --- 4. Cloudflare Tunnel (link temporario trycloudflare.com) ---------
set "CF=cloudflared"
where cloudflared >nul 2>nul
if errorlevel 1 (
  if exist "%ProgramFiles%\cloudflared\cloudflared.exe" (set "CF=%ProgramFiles%\cloudflared\cloudflared.exe") else if exist "%ProgramFiles(x86)%\cloudflared\cloudflared.exe" (set "CF=%ProgramFiles(x86)%\cloudflared\cloudflared.exe") else if exist "%~dp0cloudflared.exe" (set "CF=%~dp0cloudflared.exe") else (
    echo [AVISO] cloudflared nao encontrado. Instale com:  winget install --id Cloudflare.cloudflared
    echo         ou coloque cloudflared.exe nesta pasta. O jogo local continua funcionando.
    goto done
  )
)
if exist "%LOGS%\cloudflared.log" del /q "%LOGS%\cloudflared.log" >nul 2>nul
echo Abrindo o tunel do Cloudflare... (log: logs-teste\cloudflared.log)
start "RAG SURVIVAL TESTE - cloudflared" /min "%CF%" tunnel --no-autoupdate --url http://127.0.0.1:%PORT% --logfile "%LOGS%\cloudflared.log"
set "PUBLIC="
for /l %%i in (1,1,30) do if not defined PUBLIC (
  timeout /t 1 /nobreak >nul
  for /f "usebackq delims=" %%u in (`powershell -NoProfile -Command "if(Test-Path '%LOGS%\cloudflared.log'){(Select-String -Path '%LOGS%\cloudflared.log' -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches | ForEach-Object {$_.Matches.Value} | Select-Object -Last 1)}"`) do set "PUBLIC=%%u"
)
if not defined PUBLIC (
  echo [AVISO] Nao consegui ler o link publico. Ele aparece no log: logs-teste\cloudflared.log ^(linha com trycloudflare.com^).
  goto done
)
> "%LOGS%\link-publico.txt" echo %PUBLIC%

:done
echo.
echo ================================================================
echo   RAG SURVIVAL - TESTE
echo   Local ^(voce^):     http://localhost:%PORT%/
if defined PUBLIC echo   Amigos ^(HTTPS^):   %PUBLIC%/
if defined PUBLIC echo   Painel admin:      %PUBLIC%/admin.html
echo   Chave do painel:   dados-teste\admin_token.txt  ^(so deste teste^)
echo   Dados do teste:    dados-teste\  ^(contas e saves so deste teste^)
echo   Para encerrar:     PARAR_RAG_SURVIVAL_TESTE.bat
echo ================================================================
echo O link do Cloudflare muda cada vez que o tunel reinicia.
start "" "http://localhost:%PORT%/"
pause

@echo off
setlocal
cd /d "%~dp0"
title RAG SURVIVAL - servidor local
if not defined PORT set "PORT=3001"
where node >nul 2>nul
if errorlevel 1 (echo Instale Node.js 22.13+ em https://nodejs.org/ & pause & exit /b 1)
node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/version').then(r=>r.json()).then(v=>process.exit(v.name==='RAG SURVIVAL'?0:2)).catch(()=>process.exit(1))"
if errorlevel 2 (
 echo A porta %PORT% ja esta sendo usada por outro programa ou por uma versao antiga do jogo.
 echo Encerre o servidor antigo antes de usar este inicializador.
 pause
 exit /b 2
)
if errorlevel 1 (
 start "RAG SURVIVAL - Servidor local" cmd /k "node server.mjs"
 timeout /t 2 /nobreak >nul
)
start "" "http://localhost:%PORT%/"
echo Servidor local aberto. Para jogar com amigos use o link publico do Railway (veja README.md).

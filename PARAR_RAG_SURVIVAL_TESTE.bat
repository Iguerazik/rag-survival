@echo off
setlocal
cd /d "%~dp0"
title RAG SURVIVAL - encerrar TESTE
if not defined RAG_TEST_PORT set "RAG_TEST_PORT=3101"
rem Encerra SOMENTE o servidor desta pasta e o tunel desta porta. Outros processos Node/cloudflared nao sao tocados.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
 "$dir=(Resolve-Path '.').Path; $port='%RAG_TEST_PORT%'; $n=0;" ^
 "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -like '*server.mjs*' -and (Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue) -and ((Get-NetTCPConnection -State Listen -OwningProcess $_.ProcessId -ErrorAction SilentlyContinue).LocalPort -contains [int]$port) } | ForEach-Object { Stop-Process -Id $_.ProcessId; $n++; Write-Host ('Servidor de teste encerrado (PID ' + $_.ProcessId + ').') };" ^
 "Get-CimInstance Win32_Process -Filter \"Name='cloudflared.exe'\" | Where-Object { $_.CommandLine -like ('*127.0.0.1:' + $port + '*') } | ForEach-Object { Stop-Process -Id $_.ProcessId; $n++; Write-Host ('Tunel do Cloudflare encerrado (PID ' + $_.ProcessId + ').') };" ^
 "if($n -eq 0){ Write-Host 'Nada do teste estava rodando.' }"
echo Os dados do teste continuam em dados-teste\ (nada foi apagado).
pause

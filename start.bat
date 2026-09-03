@echo off
cd /d "%~dp0"
start "Saju Server" cmd /k "node server.js"
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

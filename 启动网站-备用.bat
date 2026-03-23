@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  pause
  exit /b 1
)

echo Starting backup launcher...
start "" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%~dp0'; node server.js"
timeout /t 2 >nul
start http://127.0.0.1:3000
echo Open http://127.0.0.1:3000 if the browser does not open automatically.
pause

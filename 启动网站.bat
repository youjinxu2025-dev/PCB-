@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found.
  echo Please install Node.js first.
  pause
  exit /b 1
)

echo Starting local website server...
start http://127.0.0.1:3000
node server.js

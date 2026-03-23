@echo off
setlocal

set "EDGE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if not exist "%EDGE%" (
  echo Edge was not found.
  pause
  exit /b 1
)

start "" "%EDGE%" "file:///D:/XM/PCB%E5%AE%A1%E6%A0%B8%E5%B9%B3%E5%8F%B0/index.html"

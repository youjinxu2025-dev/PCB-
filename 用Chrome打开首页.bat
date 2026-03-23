@echo off
setlocal

set "CHROME=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo Chrome was not found.
  pause
  exit /b 1
)

start "" "%CHROME%" "file:///D:/XM/PCB%E5%AE%A1%E6%A0%B8%E5%B9%B3%E5%8F%B0/index.html"

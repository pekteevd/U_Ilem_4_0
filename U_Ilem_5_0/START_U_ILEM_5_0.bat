@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Не найден Node.js. Установите Node.js 18 или новее и повторите запуск.
  pause
  exit /b 1
)
start "" http://127.0.0.1:4175
node server.js
pause

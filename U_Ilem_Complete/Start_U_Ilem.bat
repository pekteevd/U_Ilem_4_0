@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo U Ilem - GAME START
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found.
    echo Install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "%~dp0U_Ilem.html" (
    echo ERROR: U_Ilem.html not found.
    echo Extract the complete package into one folder.
    pause
    exit /b 1
)

if not exist "%~dp0server.js" (
    echo ERROR: server.js not found.
    pause
    exit /b 1
)

echo Starting local server...
start "U Ilem Server" /min cmd.exe /d /k node "%~dp0server.js"

echo Waiting for server...
set "READY=0"

for /l %%i in (1,1,25) do (
    powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4317/api/health'; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set "READY=1"
        goto OPEN_GAME
    )
    timeout /t 1 >nul
)

:OPEN_GAME
if "%READY%"=="1" (
    echo Server is ready. Opening game...
    start "" "http://127.0.0.1:4317"
    echo.
    echo Keep the server window open while playing.
) else (
    echo ERROR: Server did not respond.
    echo Check the server window for details.
    pause
    exit /b 1
)

endlocal
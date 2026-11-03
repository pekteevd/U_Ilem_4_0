@echo off
setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo У Илем 4.0 - GAME START
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js was not found.
    echo Install Node.js LTS from https://nodejs.org/
    pause
    exit /b 1
)

if not exist "%~dp0U_Ilem_4_0.html" (
    echo ERROR: U_Ilem_4_0.html was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_base.html" (
    echo ERROR: U_Ilem_4_0_base.html was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_server.js" (
    echo ERROR: U_Ilem_4_0_server.js was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_lighting.js" (
    echo ERROR: U_Ilem_4_0_lighting.js was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_interiors.js" (
    echo ERROR: U_Ilem_4_0_interiors.js was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_ecology.js" (
    echo ERROR: U_Ilem_4_0_ecology.js was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_water.js" (
    echo ERROR: U_Ilem_4_0_water.js was not found.
    pause
    exit /b 1
)
if not exist "%~dp0U_Ilem_4_0_production.js" (
    echo ERROR: U_Ilem_4_0_production.js was not found.
    pause
    exit /b 1
)

powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4320/api/health'; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo Starting local server...
    start "У Илем 4.0 Server" /min cmd.exe /d /k node "%~dp0U_Ilem_4_0_server.js"
)

echo Waiting for local server...
set "READY=0"
for /l %%i in (1,1,30) do (
    powershell -NoProfile -Command "try { $r=Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 'http://127.0.0.1:4320/api/health'; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set "READY=1"
        goto OPEN_GAME
    )
    timeout /t 1 >nul
)

:OPEN_GAME
if "%READY%"=="1" (
    echo Server is ready. Opening game...
    start "" "http://127.0.0.1:4320/U_Ilem_4_0.html"
    echo.
    echo Keep the server window open while playing.
) else (
    echo ERROR: Local server did not respond on port 4320.
    echo Check the server window for details.
    pause
    exit /b 1
)

endlocal

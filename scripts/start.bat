@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0\.."

echo.
echo ========================================
echo   WebHub - Project Management Center
echo ========================================
echo.

where node >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js ^>= 18.0
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=3" %%v in ('node -v 2^>nul') do set NODE_VERSION=%%v
echo [OK] Node.js version: !NODE_VERSION!

if not exist "node_modules" (
    echo [INFO] First run, installing dependencies...
    call npm install
    if !errorlevel! neq 0 (
        echo [ERROR] Dependency installation failed
        pause
        exit /b 1
    )
    echo.
)

netstat -ano | findstr ":3000" >nul 2>&1
if !errorlevel! equ 0 (
    echo [WARN] Port 3000 is already in use
    echo.
    set /p choice="Force kill old process and restart? (Y/N): "
    if /i "!choice!"=="Y" (
        for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000"') do taskkill /F /PID %%a >nul 2>&1
        timeout /t 2 >nul
    ) else (
        echo [INFO] Please manually close the process using port 3000
        pause
        exit /b 1
    )
)

echo [STARTING] Launching WebHub service...
echo.

start "WebHub Server" cmd /k "node server.js"

echo.
echo ========================================
echo   [OK] WebHub started
echo   URL: http://localhost:3000
echo ========================================
echo.

timeout /t 3 >nul
start http://localhost:3000

echo [INFO] Browser opened. Close the server window to stop.
pause

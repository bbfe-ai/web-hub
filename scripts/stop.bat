@echo off
setlocal EnableDelayedExpansion

echo.
echo ========================================
echo   WebHub - Stop Service
echo ========================================
echo.

set PORT=3000
echo [CHECK] Looking for process on port %PORT%...
echo.

netstat -ano | findstr ":%PORT% " >nul 2>&1
if !errorlevel! neq 0 (
    echo [INFO] No service running on port %PORT%
    echo.
    pause
    exit /b 0
)

echo [FOUND] Process using port %PORT%:
echo.
set found_pid=
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% "') do (
    echo   PID: %%a
    tasklist /FI "PID eq %%a" /NH 2>nul | findstr /V "INFO:"
    set found_pid=%%a
)
echo.

set /p choice="Stop these processes? (Y/N): "
if /i not "!choice!"=="Y" (
    echo [CANCEL] Operation cancelled
    pause
    exit /b 0
)

echo.
echo [STOPPING] Terminating process...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% "') do (
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo   [OK] PID %%a stopped
    ) else (
        echo   [FAIL] PID %%a stop failed
    )
)

echo.
echo ========================================
echo   [OK] Service stopped
echo ========================================
echo.

timeout /t 2 >nul
exit /b 0

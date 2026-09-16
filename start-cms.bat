@echo off
setlocal enabledelayedexpansion
title Church Management System
cd /d "%~dp0"

echo.
echo ============================================
echo   Church Management System - Starting
echo ============================================
echo   PostgreSQL:  localhost:5432 (service postgresql-x64-16)
echo   Backend:    http://localhost:3000/api  (Swagger: /api/docs)
echo   Frontend:   http://localhost:3001
echo ============================================
echo.

rem Make sure PostgreSQL is running
sc query postgresql-x64-16 >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=3" %%s in ('sc query postgresql-x64-16 ^| find "STATE"') do if not "%%s"=="RUNNING" net start postgresql-x64-16 >nul 2>&1
) else (
    echo WARNING: PostgreSQL service not found. Start it before continuing.
)

echo Starting backend (NestJS)...
start "CMS Backend" cmd /k "cd /d %~dp0backend && npm run start:dev"

echo Starting frontend (Next.js)...
start "CMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Waiting for the frontend to come up...
for /l %%i in (1,1,45) do (
    timeout /t 2 /nobreak >nul
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://localhost:3001' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } } catch { exit 1 }" >nul 2>&1
    if !errorlevel!==0 goto up
)
echo Frontend did not respond in time - check the console windows.
goto end

:up
echo.
echo Frontend is live at http://localhost:3001 - opening browser...
start http://localhost:3001

:end
echo.
echo Both servers are running in their own windows.
echo Close the "CMS Backend" and "CMS Frontend" windows to stop them.
echo.

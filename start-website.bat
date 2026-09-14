@echo off
title Circulink — Local Web Server
cd /d "%~dp0"
echo =======================================================
echo    CIRCULINK: Verified Waste. Trusted Trade.
echo =======================================================
echo.
echo Menjalankan local server dan membuka browser...
echo URL: http://localhost:8080/
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\server.ps1" -Port 8080
pause

@echo off
title Circulink — Local Web Server
cd /d "%~dp0"
echo =======================================================
echo    CIRCULINK: Verified Waste. Trusted Trade.
echo =======================================================
echo.
echo Menjalankan local server dan membuka browser...
echo URL: http://localhost:5000/
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File ".\server.ps1" -Port 5000
pause

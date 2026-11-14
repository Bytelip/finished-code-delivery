@echo off
setlocal
cd /d "%~dp0"
title AgroSpace Nexus - Local Website Host

echo ====================================================================
echo                   AGROSPACE NEXUS - LOCAL HOST
echo ====================================================================
echo.
echo  Starting standalone local website server...
echo.
echo  [OK] Local URL:   http://localhost:8080/
echo  [OK] Network URL: http://192.168.0.3:8080/
echo.
echo  Press Ctrl+C to stop the server at any time.
echo ====================================================================
echo.

call npm run start

pause

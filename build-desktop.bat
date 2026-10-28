@echo off
setlocal
title Inkova Desktop Build (Local EXE ^& Installers)

echo =====================================================================
echo                  Inkova Local Desktop Build
echo =====================================================================
echo.

cd /d "d:\WorkSpace\inkova"

echo [1/3] Running tests...
call npm test
if %errorLevel% neq 0 (
    echo [ERROR] Tests failed! Aborting build.
    pause
    exit /b %errorLevel%
)

echo [2/3] Building frontend assets...
call npm run build
if %errorLevel% neq 0 (
    echo [ERROR] Frontend build failed! Aborting build.
    pause
    exit /b %errorLevel%
)

echo [3/3] Compiling Tauri v2 Windows EXE and Installers...
call npm run tauri build
if %errorLevel% neq 0 (
    echo [ERROR] Tauri build failed!
    pause
    exit /b %errorLevel%
)

echo.
echo =====================================================================
echo  SUCCESS! Build completed successfully.
echo  Your files are located at:
echo    Executable: d:\WorkSpace\inkova\src-tauri\target\release\inkova.exe
echo    Installer:  d:\WorkSpace\inkova\src-tauri\target\release\bundle\nsis\
echo =====================================================================
echo.
pause

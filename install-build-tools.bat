@echo off
setlocal
title Installing Visual Studio C++ Build Tools for Inkova

:: Check for Administrative privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Requesting Administrator privileges to install Visual Studio C++ Build Tools...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

echo =====================================================================
echo    Installing Visual Studio 2022 C++ Build Tools (MSVC Linker)
echo =====================================================================
echo.
echo Installing C++ Desktop Development tools in the background...
echo This will take a couple of minutes to download and configure.
echo A progress dialog will show the installation status.
echo.

set INSTALLER_PATH=C:\Users\SKGUPTA\AppData\Local\Temp\WinGet\Microsoft.VisualStudio.2022.BuildTools.17.14.42\vs_BuildTools.exe

if not exist "%INSTALLER_PATH%" (
    echo Downloading vs_BuildTools.exe...
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://aka.ms/vs/17/release/vs_BuildTools.exe' -OutFile '%TEMP%\vs_BuildTools.exe'"
    set INSTALLER_PATH=%TEMP%\vs_BuildTools.exe
)

"%INSTALLER_PATH%" --passive --norestart --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended

echo.
echo =====================================================================
echo    Installation Complete! You can now build Inkova.
echo =====================================================================
pause

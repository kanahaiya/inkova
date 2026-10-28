# Inkova - Local Windows C++ Build Tools Setup Script
# Run this script in an Administrator PowerShell prompt if you wish to compile native desktop binaries locally.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Inkova - Local Windows Build Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if winget is available
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Error "winget is not found. Please install the App Installer from Microsoft Store."
    exit 1
}

Write-Host "[1/3] Installing Visual Studio 2022 C++ Build Tools via winget..." -ForegroundColor Yellow
winget install --id Microsoft.VisualStudio.2022.BuildTools --override "--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended" --accept-source-agreements --accept-package-agreements

Write-Host "[2/3] Verifying Rust MSVC target..." -ForegroundColor Yellow
rustup default stable-x86_64-pc-windows-msvc

Write-Host "[3/3] Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "You can now test and build locally:" -ForegroundColor Cyan
Write-Host "  - Run in development mode:  npm run tauri dev" -ForegroundColor White
Write-Host "  - Compile local release:    npm run tauri build" -ForegroundColor White
Write-Host ""

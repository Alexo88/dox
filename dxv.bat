@echo off
:: Khipu Codex Dev Launcher
:: Reconstruye el bundle de frontend e inicia Tauri en modo Dev

SETLOCAL EnableDelayedExpansion
SET "ROOT=%~dp0"

cd /d "%ROOT%"
echo [1/2] Reconstruyendo bundle de frontend...
call node build.js
if errorlevel 1 (
    echo [ERROR] Fallo el build de frontend.
    pause
    exit /b 1
)

echo.
echo [2/2] Iniciando Khipu Codex en modo Dev...
cd /d "%ROOT%src-tauri"
cargo tauri dev

@echo off
:: DocxLite Launcher
:: Ejecuta el EXE portable nativo de Windows

SETLOCAL EnableDelayedExpansion

SET "ROOT=%~dp0"
SET "EXE_RELEASE=%ROOT%src-tauri\target\release\app.exe"
SET "EXE_DEBUG=%ROOT%src-tauri\target\debug\app.exe"

:: Prioridad 1: EXE Release (nativo, optimizado)
IF EXIST "%EXE_RELEASE%" (
    start "" "%EXE_RELEASE%"
    exit /b 0
)

:: Prioridad 2: EXE Debug (desarrollo)
IF EXIST "%EXE_DEBUG%" (
    start "" "%EXE_DEBUG%"
    exit /b 0
)

echo [ERROR] No se encontro DocxLite.exe
echo.
echo Para compilar la version nativa:
echo   cd src-tauri ^&^& cargo tauri build
pause
exit /b 1

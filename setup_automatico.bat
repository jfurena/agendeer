@echo off
title Configuracion Automatica de Agendeer
color 0f
cls

echo ========================================================
echo   CONFIGURACION AUTOMATICA - GITHUB
echo ========================================================
echo.

:: 1. Verificar si gh esta instalado
where gh >nul 2>nul
if %errorlevel% neq 0 (
    echo [ESPERANDO] La instalacion de GitHub CLI aun no termina o necesitas reiniciar.
    echo.
    echo Por favor, espera unos minutos o cierra y abre esta ventana.
    echo Si sigue sin funcionar, reinicia tu PC para que se actualice el sistema.
    pause
    exit
)

echo [1/3] Iniciando sesion en GitHub...
echo.
echo Se abrira tu navegador. Por favor, inicia sesion y autoriza.
echo.
gh auth login -p https -w

if %errorlevel% neq 0 (
    echo [ERROR] No se pudo iniciar sesion.
    pause
    exit
)

echo.
echo [2/3] Creando repositorio 'agendeer'...
echo.
:: Intentar crear repo publico. Si falla (ya existe), continuamos.
gh repo create agendeer --public --source=. --remote=origin 2>nul

echo.
echo [3/3] Subiendo codigo a la nube...
echo.
git push -u origin master

echo.
echo ========================================================
echo   [EXITO] !PROYECTO SUBIDO A GITHUB!
echo ========================================================
echo.
echo Ahora ve a Vercel importalo desde tu cuenta de GitHub.
echo.
pause

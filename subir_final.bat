@echo off
title SUBIR AGENDEER (INTENTO FINAL)
color 0a
cls

echo ========================================================
echo   SINCRONIZANDO CON GITHUB...
echo ========================================================
echo.

:: 1. Obtener nombre de usuario de GitHub
echo [1/4] Verificando usuario...
for /f "tokens=*" %%i in ('gh api user --jq .login') do set GITHUB_USER=%%i

if "%GITHUB_USER%"=="" (
    echo [ERROR] No estas logueado correctamente.
    echo Por favor ejecuta 'gh auth login' o el script anterior de nuevo.
    pause
    exit
)
echo Hola, %GITHUB_USER%!

:: 2. Intentar crear repo (si no existe)
echo.
echo [2/4] Verificando repositorio 'agendeer'...
gh repo create agendeer --public --source=. --remote=origin 2>nul

:: 3. Asegurar que el remote existe (si el paso anterior fallo porque ya existia)
echo.
echo [3/4] Configurando conexion...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/agendeer.git

:: 4. Subir
echo.
echo [4/4] SUBIENDO ARCHIVOS...
git push -u origin master

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al subir.
    echo - Tal vez necesitas hacer 'git pull' primero si el repo no estaba vacio.
    echo - O revisa tu conexion a internet.
) else (
    echo.
    echo ========================================================
    echo   [EXITO] !TODO ESTA EN LA NUBE!
    echo ========================================================
    echo.
    echo URL: https://github.com/%GITHUB_USER%/agendeer
)
echo.
pause

@echo off
title CONECTAR Y SUBIR AGENDEER (ROBUSTO)
color 1f
cls

echo ========================================================
echo   INTENTO FINAL: CONEXION DIRECTA
echo ========================================================
echo.

set "GH_EXE=C:\Program Files\GitHub CLI\gh.exe"

if not exist "%GH_EXE%" (
    echo [ERROR] No encuentro el programa de GitHub en:
    echo %GH_EXE%
    echo.
    echo Por favor, reinicia tu ordenador y vuelve a intentar.
    pause
    exit
)

echo 1. Te pedira iniciar sesion.
echo    - Presiona ENTER.
echo    - Copia el codigo.
echo    - Pegalo en el navegador.
echo.
echo Presiona una tecla para empezar...
pause >nul

:: Paso 1: Login Forzoso
echo.
echo [1/4] Solicitando acceso...
"%GH_EXE%" auth login -p https -w

if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Si ya estabas conectado, continuamos...
)

:: Paso 2: Obtener usuario
echo.
echo [2/4] Verificando usuario...
set GITHUB_USER=
for /f "tokens=*" %%i in ('"%GH_EXE%" api user --jq .login') do set GITHUB_USER=%%i

if "%GITHUB_USER%"=="" (
    echo.
    echo [!] No pudimos detectar tu usuario automaticamente.
    set /p GITHUB_USER="Por favor, escribe tu usuario de GitHub: "
)

echo.
echo [INFO] Usuario detectado: %GITHUB_USER%

:: Paso 3: Crear Repo
echo.
echo [3/4] Creando proyecto en la nube...
"%GH_EXE%" repo create agendeer --public --source=. --remote=origin --push 2>nul

:: Paso 4: Forzar subida
echo.
echo [4/4] Forzando subida de archivos...
git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/agendeer.git
git branch -M master
git push -u origin master

if %errorlevel% neq 0 (
    echo.
    echo [ERROR CRITICO] No se pudo subir.
    echo Revisa tu conexion o si el repositorio ya existe con otro codigo.
    pause
    exit
)

echo.
echo ========================================================
echo   ¡EXITO TOTAL!
echo ========================================================
echo.
echo Tu URL es: https://github.com/%GITHUB_USER%/agendeer
echo.
pause

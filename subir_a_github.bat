@echo off
title Subir Agendeer a GitHub
color 0f
cls

echo ========================================================
echo   SUBIR AGENDEER A GITHUB - ASISTENTE AUTOMATICO
echo ========================================================
echo.
echo  Paso 1: Ve a https://github.com/new y crea un repositorio vacio.
echo  Paso 2: Copia la URL del repositorio (ej: https://github.com/tu-usuario/agendeer.git)
echo.
set /p repo_url="Pegue la URL aqui y presione ENTER: "

if "%repo_url%"=="" goto error

echo.
echo [1/3] Configurando origen remoto...
git remote remove origin 2>nul
git remote add origin %repo_url%

echo.
echo [2/3] Verificando rama principal...
git branch -M master

echo.
echo [3/3] Subiendo archivos...
echo.
git push -u origin master

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algo salio mal. Verifique que la URL sea correcta y tenga permisos.
    pause
    exit /b
)

echo.
echo ========================================================
echo   [EXITO] !PROYECTO SUBIDO CORRECTAMENTE!
echo ========================================================
echo.
pause
exit

:error
echo.
echo [ERROR] No ingreso ninguna URL.
pause
goto start

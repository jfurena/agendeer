@echo off
title Actualizar Agendeer en GitHub
color 0e
cls

echo ========================================================
echo   GUARDANDO CAMBIOS Y SUBIENDO A LA NUBE
echo ========================================================
echo.

set /p msg="Escribe una nota sobre los cambios (ej: 'Nuevo boton'): "

if "%msg%"=="" set msg="Actualizacion automatica"

echo.
echo [1/3] Preparando archivos...
git add .

echo.
echo [2/3] Guardando version...
git commit -m "%msg%"

echo.
echo [3/3] Enviando a GitHub...
git push

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo subir. Revisa tu internet.
    pause
    exit
)

echo.
echo ========================================================
echo   ¡ACTUALIZACION COMPLETADA!
echo ========================================================
echo.
timeout /t 5

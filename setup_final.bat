@echo off
title Configuración Final Agendeer
color 1f
cls

echo ========================================================
echo   CONFIGURACION GITHUB - INTENTO SIMPLE
echo ========================================================
echo.

echo 1. Vamos a conectar con GitHub.
echo    Cuando presiones una tecla, aparecera un CODIGO en esta pantalla
echo    y se abrira el navegador.
echo.
echo    IMPORTANTE: COPIA ESE CODIGO Y PEGALO EN EL NAVEGADOR.
echo    (No esperes ningun correo, el codigo sale AQUI abajo)
echo.
pause

echo.
echo --- TU CODIGO ES EL SIGUIENTE (Copialo): ---
echo.
gh auth login -p https -w

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Si ya estabas conectado, ignoramos este error y seguimos...
)

echo.
echo 2. Creando el proyecto en GitHub...
echo.
gh repo create agendeer --public --source=. --remote=origin --push 2>nul

if %errorlevel% neq 0 (
    echo [AVISO] Quizas el repositorio ya existe o hubo un error menor.
    echo Intentando subir cambios forzosamente...
    git push -u origin master
)

echo.
echo ========================================================
echo   ¡LISTO! PROCESO TERMINADO.
echo   Si ves mensajes de error arriba, avísame.
echo   Si dice "Everything up-to-date" o "Success", todo salió bien.
echo ========================================================
echo.
pause

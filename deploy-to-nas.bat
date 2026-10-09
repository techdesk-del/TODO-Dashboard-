@echo off
:: ============================================================
:: UrbanGaon Todo — 1-Click NAS Live Deploy Script
:: Double click this file to push code & update your Synology NAS!
:: ============================================================

title UrbanGaon NAS Deployer
echo ===================================================
echo   UrbanGaon AI Todo Platform - 1-Click NAS Deploy
echo ===================================================
echo.

:: 1. Push code to Git
echo [1/2] Pushing latest code to Git...
git add .
set /p commit_msg="Enter commit message (or press Enter for auto-update): "
if "%commit_msg%"=="" set commit_msg="auto update %date% %time%"
git commit -m "%commit_msg%"
git push origin main
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Git push failed. Please check your git connection.
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Code pushed to Git!
echo.

:: 2. Trigger instant update on Synology NAS via SSH
set /p nas_ip="Enter your Synology NAS IP (e.g. 192.168.1.100): "
set /p nas_user="Enter your NAS username (default: admin): "
if "%nas_user%"=="" set nas_user=admin

echo [2/2] Updating Synology NAS live container...
ssh %nas_user%@%nas_ip% "cd /volume1/docker/urbangaon-todo && git pull origin main && sudo docker compose up -d --build urbangaon-todo"

echo.
echo ===================================================
echo   SUCCESS! Your Synology DS925+ is updated & live!
echo ===================================================
pause

@echo off
echo PCM Photo Management System - Development Environment
echo ====================================================

:: Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo Starting development environment...
echo.

:: Start Docker Compose services
docker-compose up -d

echo.
echo Services are starting up. This may take several minutes on first run...
echo.

:: Wait for services to be ready
echo Waiting for services to be ready...
timeout /t 30 /nobreak >nul

:: Test services
echo.
echo Testing services...
echo.

:: Check backend health
curl -s http://localhost:8000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend API: OK
) else (
    echo Backend API: Starting...
)

:: Check frontend
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend: OK
) else (
    echo Frontend: Starting...
)

echo.
echo Development environment is ready!
echo.
echo Quick links:
echo   Frontend:     http://localhost:3000
echo   API Docs:     http://localhost:8000/docs
echo   Health Check: http://localhost:8000/health
echo   Flower:       http://localhost:5555
echo.
echo Useful commands:
echo   View logs:    docker-compose logs -f [service]
echo   Stop all:     docker-compose down
echo   Restart:      docker-compose restart [service]
echo.

pause
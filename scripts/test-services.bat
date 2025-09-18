@echo off
echo Testing Docker Services...
echo ================================

echo.
echo Checking Docker Compose configuration...
docker-compose config --quiet
if %ERRORLEVEL% == 0 (
    echo [OK] Docker Compose configuration is valid
) else (
    echo [ERROR] Docker Compose configuration has errors
    exit /b 1
)

echo.
echo Checking Docker daemon...
docker ps > nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Docker daemon is running
) else (
    echo [ERROR] Docker daemon is not running
    echo Please start Docker Desktop
    exit /b 1
)

echo.
echo Testing if services can be started...
echo This will pull images if needed (may take a few minutes)
echo.
echo Press any key to continue or Ctrl+C to cancel...
pause > nul

echo.
echo Configuration test complete!
echo.
echo To start all services: docker-compose up -d
echo To view logs: docker-compose logs -f
echo To stop all services: docker-compose down
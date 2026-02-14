@echo off
echo ========================================
echo   VoltView Backend Server Startup
echo ========================================
echo.

cd voltview-backend

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo Installing dependencies if needed...
if not exist "node_modules" (
    echo Running npm install...
    call npm install
)

echo.
echo Starting backend server...
echo Backend will run on http://localhost:4000
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

pause

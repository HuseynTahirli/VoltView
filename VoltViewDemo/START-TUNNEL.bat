@echo off
echo ========================================
echo   VoltView Remote Tunnel Startup
echo ========================================
echo.
echo Starting Cloudflare Tunnel to expose localhost:4000...
echo Please share the provided URL (e.g., https://something.trycloudflare.com)
echo.
echo Press Ctrl+C to stop the tunnel
echo ========================================
echo.

cd voltview-backend
cloudflared.exe tunnel --url http://localhost:4000

pause

@echo off
echo Starting HateGuard Full Stack System...
echo.

echo Starting ML Backend (Python Flask)...
start "ML Backend" cmd /k "cd ml_backend && python app.py"

echo Waiting for ML Backend to start...
timeout /t 3 /nobreak > nul

echo Starting Express Server (Node.js)...
start "Express Server" cmd /k "npm run dev"

echo.
echo Both services are starting...
echo ML Backend: http://localhost:5003
echo Frontend: http://localhost:3002
echo.
echo Press any key to close this window...
pause > nul 
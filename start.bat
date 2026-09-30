@echo off
echo ========================================================
echo EMERGENCY AI - ONE-CLICK INSTALLER AND LAUNCHER
echo ========================================================
echo.

echo [1/2] Starting Backend Services via Docker Compose...
docker-compose up --build -d
echo.

echo [2/2] Installing and Starting Desktop App (Electron/Vite)...
cd desktop
echo Installing Node.js packages (this may take a few minutes)...
call npm install
echo Starting Desktop App...
start cmd /k "title EmergencyAI Desktop & npm run dev"
cd ..
echo.

echo ========================================================
echo ALL SYSTEMS GO! 
echo The Desktop App should open shortly.
echo Backend API is running at: http://localhost:5000
echo AI Service is running at: http://localhost:8000
echo ========================================================
pause

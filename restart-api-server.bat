@echo off
echo Restarting API server...

cd apps\api

rem Kill any existing node processes
taskkill /f /im node.exe

rem Wait for processes to fully terminate
timeout /t 3

rem Run the direct fix script
echo Running direct fix script...
node direct-fix.js

rem Generate Prisma client
echo Generating Prisma client...
call npx prisma generate

rem Start API server
echo Starting API server...
npm run dev

echo Done! 
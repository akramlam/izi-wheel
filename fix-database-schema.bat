n@echo off
echo Starting database schema fix process...

cd apps\api

echo Step 0: Installing required dependencies...
npm install uuid --save

echo Step 1: Running simplified fix script (direct SQL)...
node fix-company-controller-simple.js
if %ERRORLEVEL% NEQ 0 (
  echo Failed to run fix-company-controller-simple.js
  exit /b %ERRORLEVEL%
)

echo Step 2: Verifying Prisma schema...
npx prisma validate
if %ERRORLEVEL% NEQ 0 (
  echo Prisma schema validation failed
  exit /b %ERRORLEVEL%
)

echo Step 3: Generating Prisma client...
taskkill /f /im node.exe
timeout /t 2
npx prisma generate
if %ERRORLEVEL% NEQ 0 (
  echo Warning: Prisma generate failed, but continuing...
)

echo Step 4: Finished!
echo Please restart your API server manually now.
echo.
echo You can run: npm run dev
echo or use PM2: pm2 restart iziwheel-api

cd ..\..
echo Process completed. 
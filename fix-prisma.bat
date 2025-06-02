@echo off
echo Fixing Prisma client generation...

:: Stop any processes that might be using the files
taskkill /f /im node.exe 2>nul

:: Clean up the problematic directories
echo Cleaning previous Prisma installation...
if exist "node_modules\.pnpm\@prisma+client*" (
  rmdir /s /q "node_modules\.pnpm\@prisma+client*"
)

:: Navigate to the API directory and regenerate Prisma
cd apps\api
echo Generating fresh Prisma client...
npx prisma generate

echo Done! If you still see errors, please run this script as Administrator. 
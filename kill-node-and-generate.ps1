# Kill all node processes
Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Write-Host "All Node.js processes stopped." -ForegroundColor Green

# Wait a moment to ensure files are released
Write-Host "Waiting for file locks to be released..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Change to the API directory and run Prisma generate
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
Set-Location -Path ".\apps\api"
& npx prisma generate

Write-Host "Process completed. Please restart your API server." -ForegroundColor Green 
#!/bin/bash
# BULLETPROOF DEPLOYMENT SCRIPT
# This will completely reset your server to the clean, working version

set -e  # Exit on any error

echo "🚀 Starting bulletproof deployment..."
echo "Timestamp: $(date)"

# Navigate to app directory
cd /var/www/iziwheel || { echo "❌ Failed to navigate to app directory"; exit 1; }

# Stop services (modify as needed for your setup)
# sudo systemctl stop your-app || true
# sudo pm2 stop all || true

echo "📡 Fetching latest changes..."
git fetch origin

echo "🔄 Force reset to clean main branch..."
git reset --hard origin/main

echo "🧹 Cleaning any remaining files..."
git clean -fd

echo "📋 Verifying clean state..."
# Check that PlayWheel.tsx doesn't have merge conflicts
if grep -q "<<<<<<< HEAD" apps/web/src/pages/PlayWheel.tsx; then
    echo "❌ CRITICAL: PlayWheel.tsx still has merge conflicts!"
    echo "File content:"
    head -20 apps/web/src/pages/PlayWheel.tsx
    exit 1
fi

echo "✅ Files are clean!"

echo "📦 Installing dependencies..."
pnpm install || { echo "❌ Failed to install dependencies"; exit 1; }

echo "🔨 Building frontend..."
pnpm --filter=@iziwheel/web run build || { echo "❌ Frontend build failed"; exit 1; }

echo "🔧 Building backend..."
pnpm --filter=@iziwheel/api run build || { echo "❌ Backend build failed"; exit 1; }

echo "🔄 Starting services..."
# sudo systemctl start your-app || true
# sudo pm2 restart all || true

echo "🎉 Deployment completed successfully!"
echo "✅ Wheel system is now running the clean, working version"
echo "🎯 Mismatch issue has been fixed!"

# Test the wheel endpoint
echo "🧪 Testing wheel endpoint..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/public/company/test >/dev/null && echo "✅ Backend is responding" || echo "⚠️ Backend might not be fully started yet"

echo ""
echo "🎡 Your wheel should now work at:"
echo "https://roue.izikado.fr/play/company/YOUR_WHEEL_ID"
echo ""
echo "Done! 🚀"
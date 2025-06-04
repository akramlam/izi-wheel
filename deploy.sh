#!/bin/bash
set -e

echo "Starting deployment at $(date)"
cd /var/www/iziwheel

# Pull latest changes
git pull

# Install dependencies
pnpm install

# Build common packages
cd packages/common-types
pnpm build
cd ../..

# Run database migrations
cd apps/api
npx prisma generate

# Check if fix-enum.js exists and run it if needed
if [ -f "fix-enum.js" ]; then
  echo "Running fix-enum.js to fix enum issues..."
  node fix-enum.js
  echo "Enum fix completed."
fi

# Continue with migrations
npx prisma migrate deploy
cd ../..

# Build API
cd apps/api
pnpm build
cd ../..

# Build web
cd apps/web
pnpm build
cd ../..

# Restart API service
pm2 restart iziwheel-api
pm2 restart iziwheel-frontend

echo "Deployment completed successfully at $(date)"

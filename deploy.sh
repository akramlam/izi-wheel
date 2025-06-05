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

# Run direct-fix.js to fix database schema issues
if [ -f "direct-fix.js" ]; then
  echo "Running direct-fix.js to fix database schema issues..."
  node direct-fix.js
  echo "Database schema fix completed."
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

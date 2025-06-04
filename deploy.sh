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

echo "Deployment completed successfully at $(date)"

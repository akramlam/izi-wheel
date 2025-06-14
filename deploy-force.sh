#!/bin/bash
set -e

echo "Starting FORCE deployment at $(date)"
cd /var/www/iziwheel

# Backup any local changes
echo "Backing up local changes..."
git add -A
git stash push -m "Force deployment backup $(date)" || true

# Reset to remote state
echo "Resetting to remote state..."
git fetch origin
git reset --hard origin/main

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

echo "Force deployment completed successfully at $(date)"
echo "Note: Any local changes have been backed up in git stash" 
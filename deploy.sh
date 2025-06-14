#!/bin/bash
set -e

echo "Starting deployment at $(date)"
cd /var/www/iziwheel

# Check if there are any local changes
if ! git diff-index --quiet HEAD --; then
  echo "Local changes detected. Stashing them before pull..."
  git stash push -m "Deployment stash $(date)"
  STASHED=true
else
  STASHED=false
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull

# If we stashed changes, try to reapply them
if [ "$STASHED" = true ]; then
  echo "Attempting to reapply stashed changes..."
  if git stash pop; then
    echo "Successfully reapplied stashed changes"
  else
    echo "Warning: Could not automatically reapply stashed changes"
    echo "You may need to manually resolve conflicts later"
    echo "Stashed changes are still available in git stash"
  fi
fi

# Install dependencies
pnpm install

# Fix JWT deployment issues
echo "Fixing JWT deployment issues..."
if [ -f "fix-jwt-deployment.js" ]; then
  node fix-jwt-deployment.js
else
  echo "JWT fix script not found, proceeding with manual fixes..."
  cd apps/api
  pnpm add jsonwebtoken @types/jsonwebtoken
  cd ../..
fi

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

# Create super user if needed
echo "Ensuring super user exists..."
if [ -f "create-super-user.js" ]; then
  cd apps/api
  node ../../create-super-user.js
  cd ../..
else
  echo "Super user creation script not found, running seed script instead..."
  cd apps/api
  npx prisma db seed
  cd ../..
fi

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

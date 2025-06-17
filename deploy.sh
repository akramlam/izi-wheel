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



# Build common packages
cd packages/common-types
pnpm build
cd ../..

# Run database migrations
cd apps/api
npx prisma generate


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

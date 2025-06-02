@echo off
echo Fixing Prisma client with local output...

:: Navigate to API directory
cd apps\api

:: Make a backup of the original schema
copy prisma\schema.prisma prisma\schema.prisma.original

:: Copy our modified schema with local output
copy prisma\schema.prisma.local prisma\schema.prisma

:: Generate Prisma client
echo Generating Prisma client with local output...
npx prisma generate

:: Restore the original schema
copy prisma\schema.prisma.original prisma\schema.prisma
del prisma\schema.prisma.original

echo Done! Now you can start the API using: cd apps\api && npm run dev
echo And start the web app using: cd apps\web && npx vite --port 3010 
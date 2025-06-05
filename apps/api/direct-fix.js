const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the database URL from the .env file
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const databaseUrl = envContent
  .split('\n')
  .find(line => line.startsWith('DATABASE_URL='))
  ?.split('=')[1]
  ?.trim();

if (!databaseUrl) {
  console.error('DATABASE_URL not found in .env file');
  process.exit(1);
}

// Direct SQL to fix everything at once
const fixSql = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add FREE to Plan enum (in a separate transaction)
DO $$
BEGIN
  BEGIN
    ALTER TYPE "Plan" ADD VALUE 'FREE';
    EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Add remainingPlays column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Company' AND column_name = 'remainingPlays'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "remainingPlays" INTEGER NOT NULL DEFAULT 50;
  END IF;
END $$;

-- Mark the migration as applied if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE migration_name = '20250605000000_add_free_plan_and_remaining_plays'
  ) THEN
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      uuid_generate_v4(),
      'manual_fix',
      NOW(),
      '20250605000000_add_free_plan_and_remaining_plays',
      'Applied manually via direct-fix.js',
      NULL,
      NOW(),
      1
    );
  END IF;
END $$;

-- Update any NULL remainingPlays values
UPDATE "Company" SET "remainingPlays" = 50 WHERE "remainingPlays" IS NULL;
`;

console.log('Applying direct fix to database...');
try {
  // Write SQL to temp file
  const tempSqlFile = path.join(__dirname, 'temp-direct-fix.sql');
  fs.writeFileSync(tempSqlFile, fixSql);
  
  // Execute SQL
  execSync(`psql "${databaseUrl}" -f "${tempSqlFile}"`, { stdio: 'inherit' });
  
  // Clean up
  fs.unlinkSync(tempSqlFile);
  
  console.log('Database fixed successfully!');
  console.log('\nNext steps:');
  console.log('1. Run: npx prisma generate');
  console.log('2. Restart your API server');
} catch (error) {
  console.error('Error applying fix:', error);
} 
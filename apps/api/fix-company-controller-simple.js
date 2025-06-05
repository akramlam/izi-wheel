const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

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

// SQL command to add the FREE enum value - must be done in a separate transaction
const addEnumSql = `
-- Add the extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add the new enum value to the Plan type with a separate transaction
BEGIN;
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';
COMMIT;
`;

// SQL commands to add the remainingPlays column and update defaults
const updateSchemaSql = `
-- Start a new transaction for the rest of the changes
BEGIN;

-- Add remainingPlays column to Company table with a default value of 50 if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Company' AND column_name = 'remainingPlays'
  ) THEN
    ALTER TABLE "Company" ADD COLUMN "remainingPlays" INTEGER NOT NULL DEFAULT 50;
  END IF;
END $$;

-- Update default plan for new companies to FREE
ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"Plan";

-- Update default maxWheels for new companies to 1
ALTER TABLE "Company" ALTER COLUMN "maxWheels" SET DEFAULT 1;

-- Commit the transaction
COMMIT;
`;

// SQL to mark migration as applied
const markMigrationSql = `
-- Check if migration exists already
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "_prisma_migrations" 
    WHERE migration_name = '20250605000000_add_free_plan_and_remaining_plays'
  ) THEN
    -- Insert the migration record using uuid_generate_v4() from the extension
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (
      uuid_generate_v4(),
      'manual_fix',
      NOW(),
      '20250605000000_add_free_plan_and_remaining_plays',
      'Applied manually via fix-company-controller-simple.js',
      NULL,
      NOW(),
      1
    );
  END IF;
END $$;
`;

try {
  // Step 1: Add the enum value first in a separate transaction
  console.log('Step 1: Adding FREE enum value...');
  const tempEnumSqlPath = path.join(__dirname, 'temp-add-enum.sql');
  fs.writeFileSync(tempEnumSqlPath, addEnumSql);
  execSync(`psql "${databaseUrl}" -f "${tempEnumSqlPath}"`, { stdio: 'inherit' });
  fs.unlinkSync(tempEnumSqlPath);
  console.log('FREE enum value added successfully!');
  
  // Step 2: Update the schema with remainingPlays column and defaults
  console.log('Step 2: Updating schema with remainingPlays column...');
  const tempSchemaSqlPath = path.join(__dirname, 'temp-update-schema.sql');
  fs.writeFileSync(tempSchemaSqlPath, updateSchemaSql);
  execSync(`psql "${databaseUrl}" -f "${tempSchemaSqlPath}"`, { stdio: 'inherit' });
  fs.unlinkSync(tempSchemaSqlPath);
  console.log('Schema updated successfully!');
  
  // Step 3: Mark the migration as applied
  console.log('Step 3: Marking migration as applied...');
  const tempMarkMigrationPath = path.join(__dirname, 'temp-mark-migration.sql');
  fs.writeFileSync(tempMarkMigrationPath, markMigrationSql);
  execSync(`psql "${databaseUrl}" -f "${tempMarkMigrationPath}"`, { stdio: 'inherit' });
  fs.unlinkSync(tempMarkMigrationPath);
  console.log('Migration marked as applied successfully!');
  
  console.log('All fixes completed successfully!');
} catch (error) {
  console.error('Error fixing schema:', error);
  process.exit(1);
} 
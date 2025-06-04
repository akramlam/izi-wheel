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

// SQL commands to fix the enum issue
const sql = `
-- First, create a transaction to ensure all operations succeed or fail together
BEGIN;

-- Add the new enum value to the Plan type
ALTER TYPE "Plan" ADD VALUE 'FREE' BEFORE 'BASIC';

-- Add remainingPlays column to Company table with a default value of 50
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "remainingPlays" INTEGER NOT NULL DEFAULT 50;

-- Update default plan for new companies to FREE (only after the type has been updated)
ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"Plan";

-- Update default maxWheels for new companies to 1
ALTER TABLE "Company" ALTER COLUMN "maxWheels" SET DEFAULT 1;

-- Commit the transaction
COMMIT;
`;

try {
  // Write the SQL to a temporary file
  const tempSqlPath = path.join(__dirname, 'temp-fix-enum.sql');
  fs.writeFileSync(tempSqlPath, sql);

  // Execute the SQL using psql
  console.log('Executing SQL commands to fix enum issue...');
  execSync(`psql "${databaseUrl}" -f "${tempSqlPath}"`, { stdio: 'inherit' });

  // Delete the temporary file
  fs.unlinkSync(tempSqlPath);

  console.log('Enum issue fixed successfully!');
  
  // Mark the migration as applied in the _prisma_migrations table
  const markMigrationSql = `
  INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
  VALUES (
    gen_random_uuid(),
    'fix_enum_manually',
    NOW(),
    '20250605000000_add_free_plan_and_remaining_plays',
    'Applied manually via fix-enum.js',
    NULL,
    NOW(),
    1
  );
  `;
  
  // Write the SQL to a temporary file
  const tempMarkMigrationPath = path.join(__dirname, 'temp-mark-migration.sql');
  fs.writeFileSync(tempMarkMigrationPath, markMigrationSql);
  
  // Execute the SQL using psql
  console.log('Marking migration as applied...');
  execSync(`psql "${databaseUrl}" -f "${tempMarkMigrationPath}"`, { stdio: 'inherit' });
  
  // Delete the temporary file
  fs.unlinkSync(tempMarkMigrationPath);
  
  console.log('Migration marked as applied successfully!');
} catch (error) {
  console.error('Error fixing enum issue:', error);
  process.exit(1);
} 
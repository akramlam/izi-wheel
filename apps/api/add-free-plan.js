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

// SQL commands to add the FREE enum value and update the schema
const sql = `
-- First, create a transaction to ensure all operations succeed or fail together
BEGIN;

-- Add the new enum value to the Plan type
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';

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

-- Update existing companies to have remainingPlays = 50 if NULL
UPDATE "Company" SET "remainingPlays" = 50 WHERE "remainingPlays" IS NULL;

-- Commit the transaction
COMMIT;
`;

try {
  // Write the SQL to a temporary file
  const tempSqlPath = path.join(__dirname, 'temp-add-free-plan.sql');
  fs.writeFileSync(tempSqlPath, sql);

  // Execute the SQL using psql
  console.log('Executing SQL commands to add FREE plan...');
  execSync(`psql "${databaseUrl}" -f "${tempSqlPath}"`, { stdio: 'inherit' });

  // Delete the temporary file
  fs.unlinkSync(tempSqlPath);

  console.log('FREE plan added successfully!');
} catch (error) {
  console.error('Error adding FREE plan:', error);
  process.exit(1);
} 
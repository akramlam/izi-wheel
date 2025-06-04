const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

async function addFreePlan() {
  try {
    console.log('Adding FREE plan to Plan enum...');
    
    // Execute SQL directly to add the FREE value to the Plan enum
    const sql = `
      ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';
    `;
    
    // Use environment variables from .env file
    const envFile = require('fs').readFileSync('.env', 'utf8');
    const dbUrl = envFile.split('\n')
      .find(line => line.startsWith('DATABASE_URL='))
      ?.split('=')[1]
      ?.trim();
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found in .env file');
    }
    
    // Execute the SQL command using psql
    execSync(`psql "${dbUrl}" -c "${sql}"`, { stdio: 'inherit' });
    
    console.log('FREE plan added to Plan enum successfully!');
    
    // Also add the remainingPlays column if it doesn't exist
    const addColumnSql = `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'Company'
          AND column_name = 'remainingPlays'
        ) THEN
          ALTER TABLE "Company" ADD COLUMN "remainingPlays" INTEGER NOT NULL DEFAULT 50;
        END IF;
      END $$;
    `;
    
    execSync(`psql "${dbUrl}" -c "${addColumnSql}"`, { stdio: 'inherit' });
    console.log('remainingPlays column added to Company table if it didn\'t exist');
    
  } catch (error) {
    console.error('Error adding FREE plan:', error);
  }
}

addFreePlan(); 
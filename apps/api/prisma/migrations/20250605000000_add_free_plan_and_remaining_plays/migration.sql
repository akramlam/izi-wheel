-- First, create a transaction to ensure all operations succeed or fail together
BEGIN;

-- Add the new enum value to the Plan type
-- We need to use ALTER TYPE in a specific way for PostgreSQL
ALTER TYPE "Plan" ADD VALUE 'FREE' BEFORE 'BASIC';

-- Add remainingPlays column to Company table with a default value of 50
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "remainingPlays" INTEGER NOT NULL DEFAULT 50;

-- Update default plan for new companies to FREE (only after the type has been updated)
ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"Plan";

-- Update default maxWheels for new companies to 1
ALTER TABLE "Company" ALTER COLUMN "maxWheels" SET DEFAULT 1;

-- Commit the transaction
COMMIT; 
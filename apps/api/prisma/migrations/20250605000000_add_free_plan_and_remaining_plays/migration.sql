-- First, add the new enum value to the Plan type
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'FREE';

-- Add remainingPlays column to Company table with a default value of 50
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "remainingPlays" INTEGER NOT NULL DEFAULT 50;

-- Update default plan for new companies to FREE (only after the type has been updated)
ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'FREE'::"Plan";

-- Update default maxWheels for new companies to 1
ALTER TABLE "Company" ALTER COLUMN "maxWheels" SET DEFAULT 1; 
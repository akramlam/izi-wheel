-- Add FREE to the Plan enum
ALTER TYPE "Plan" ADD VALUE 'FREE' BEFORE 'BASIC';

-- Add remainingPlays column to Company table
ALTER TABLE "Company" ADD COLUMN "remainingPlays" INTEGER NOT NULL DEFAULT 50;

-- Update default plan for new companies to FREE
ALTER TABLE "Company" ALTER COLUMN "plan" SET DEFAULT 'FREE';

-- Update default maxWheels for new companies to 1
ALTER TABLE "Company" ALTER COLUMN "maxWheels" SET DEFAULT 1; 
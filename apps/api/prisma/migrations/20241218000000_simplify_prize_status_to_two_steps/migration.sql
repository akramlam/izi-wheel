-- Update all existing CLAIMED statuses to PENDING for the simplified 2-step system
UPDATE "Play" SET "redemptionStatus" = 'PENDING' WHERE "redemptionStatus" = 'CLAIMED';

-- Drop the old enum
DROP TYPE "RedemptionStatus";

-- Create new enum with only PENDING and REDEEMED
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'REDEEMED');

-- Update the Play table to use the new enum
ALTER TABLE "Play" 
ALTER COLUMN "redemptionStatus" TYPE "RedemptionStatus" 
USING "redemptionStatus"::text::"RedemptionStatus";
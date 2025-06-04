-- Check if remainingPlays column exists, if not, add it
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
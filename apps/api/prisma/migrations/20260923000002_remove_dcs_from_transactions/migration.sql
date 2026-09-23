-- Remove dcs JSONB column from transactions table
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "dcs";

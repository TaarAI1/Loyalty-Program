-- Add gross_amount column to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "gross_amount" DECIMAL(10,2);

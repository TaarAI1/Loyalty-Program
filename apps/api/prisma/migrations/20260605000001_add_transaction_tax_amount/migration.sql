-- Add tax_amount column to transactions table
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(10,2);

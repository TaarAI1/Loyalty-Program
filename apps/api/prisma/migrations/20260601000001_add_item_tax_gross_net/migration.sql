-- Add tax_amount, gross_amount, net_amount to transaction_items
ALTER TABLE "transaction_items"
  ADD COLUMN IF NOT EXISTS "tax_amount"   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "gross_amount" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "net_amount"   DECIMAL(10,2);

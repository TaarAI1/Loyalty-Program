-- Add customer info columns to form_responses
ALTER TABLE "form_responses"
  ADD COLUMN IF NOT EXISTS "customer_name"  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "customer_phone" VARCHAR(20);

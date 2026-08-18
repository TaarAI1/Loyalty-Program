-- Migration: drop expiry_email from email_config
-- The points expiry email is now sent directly to the customer's own email
-- address (customer.email), so a fixed recipient config field is not needed.

ALTER TABLE "email_config" DROP COLUMN IF EXISTS "expiry_email";
ALTER TABLE "points_expiry"
  ALTER COLUMN "expiry_date" TYPE TIMESTAMPTZ
  USING "expiry_date"::TIMESTAMPTZ,
  ALTER COLUMN "earning_date" TYPE TIMESTAMPTZ
  USING "earning_date"::TIMESTAMPTZ;
ALTER TABLE "email_config"
  ADD COLUMN IF NOT EXISTS "expiry_window_value" INTEGER,
  ADD COLUMN IF NOT EXISTS "expiry_window_unit"  VARCHAR(10) DEFAULT 'days';

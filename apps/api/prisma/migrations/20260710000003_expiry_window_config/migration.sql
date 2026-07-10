ALTER TABLE "email_config"
  ADD COLUMN IF NOT EXISTS "expiry_window_value" INTEGER,
  ADD COLUMN IF NOT EXISTS "expiry_window_unit"  VARCHAR(10) DEFAULT 'days';

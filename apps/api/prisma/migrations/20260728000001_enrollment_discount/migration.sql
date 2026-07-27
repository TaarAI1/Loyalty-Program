ALTER TABLE "email_config"
  ADD COLUMN IF NOT EXISTS "enrollment_discount_pct"    INT     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "enrollment_discount_active" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "legal_name"        VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "preferred_name"    VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "nationality"       VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "city"              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "area"              VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "home_address"      TEXT,
  ADD COLUMN IF NOT EXISTS "delivery_address"  TEXT,
  ADD COLUMN IF NOT EXISTS "alternate_phone"   VARCHAR(20);

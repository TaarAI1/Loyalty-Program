-- Migration: replace SendGrid api_key with SMTP fields on email_config

ALTER TABLE "email_config"
  ADD COLUMN IF NOT EXISTS "smtp_host"   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "smtp_port"   INTEGER,
  ADD COLUMN IF NOT EXISTS "smtp_user"   VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "smtp_pass"   TEXT,
  ADD COLUMN IF NOT EXISTS "smtp_secure" VARCHAR(10) DEFAULT 'tls';

-- Move any existing encrypted api_key value into smtp_pass so no data is lost
UPDATE "email_config" SET "smtp_pass" = "api_key" WHERE "api_key" IS NOT NULL;

-- Keep api_key column for now (soft drop — Prisma ignores it, harmless)
-- If you want a hard drop: ALTER TABLE "email_config" DROP COLUMN IF EXISTS "api_key";

-- Update default provider to smtp
UPDATE "email_config" SET "provider" = 'smtp' WHERE "provider" = 'sendgrid';

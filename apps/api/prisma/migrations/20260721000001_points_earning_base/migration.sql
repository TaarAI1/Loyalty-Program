ALTER TABLE "email_config" ADD COLUMN IF NOT EXISTS "points_earning_base" VARCHAR(50) NOT NULL DEFAULT 'net_amount';

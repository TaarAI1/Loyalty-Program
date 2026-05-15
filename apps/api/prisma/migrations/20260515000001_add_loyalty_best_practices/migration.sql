-- Points Rules table
CREATE TABLE "points_rules" (
    "id" SERIAL NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "value" DECIMAL(8,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "points_rules_pkey" PRIMARY KEY ("id")
);

-- Campaigns table
CREATE TABLE "campaigns" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "multiplier" DECIMAL(4,2) NOT NULL DEFAULT 2,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "target_tier_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_target_tier_id_fkey"
  FOREIGN KEY ("target_tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Customer enhancements
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "segment" VARCHAR(30) DEFAULT 'new';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "engagement_score" INTEGER NOT NULL DEFAULT 0;

-- Notes field on points_ledger
ALTER TABLE "points_ledger" ADD COLUMN IF NOT EXISTS "notes" TEXT;

-- Seed default points rules
INSERT INTO "points_rules" ("type","name","value","is_active","updated_at") VALUES
  ('welcome_bonus',       'Welcome Bonus',          500,  true, NOW()),
  ('birthday_multiplier', 'Birthday Multiplier',    3,    true, NOW()),
  ('first_purchase_bonus','First Purchase Bonus',   200,  true, NOW()),
  ('global_multiplier',   'Weekend Bonus (Inactive)',1.5, false, NOW());

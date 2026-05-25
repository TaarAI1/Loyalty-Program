-- Required for gen_random_uuid() on PostgreSQL (e.g. Railway)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "loyalty_tiers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "points_from" INTEGER NOT NULL,
    "points_to" INTEGER,
    "spend_from" DECIMAL(10,2) NOT NULL,
    "spend_to" DECIMAL(10,2),
    "reward_percentage" DECIMAL(5,2) NOT NULL,
    "benefits" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "loyalty_tiers_name_key" ON "loyalty_tiers"("name");

CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "retailpro_id" VARCHAR(100),
    "name" VARCHAR(255) NOT NULL,
    "mobile_number" VARCHAR(20) NOT NULL,
    "country_code" VARCHAR(5) NOT NULL DEFAULT '92',
    "email" VARCHAR(255),
    "date_of_birth" DATE,
    "gender" VARCHAR(20),
    "region" VARCHAR(100),
    "store" VARCHAR(100),
    "tier_id" INTEGER,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_sale" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "last_visit_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "customers_retailpro_id_key" ON "customers"("retailpro_id");
CREATE UNIQUE INDEX "customers_mobile_country_key" ON "customers"("mobile_number","country_code");
CREATE INDEX "idx_customer_tier" ON "customers"("tier_id");

CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "retailpro_transaction_id" VARCHAR(100) NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "sale_amount" DECIMAL(10,2) NOT NULL,
    "points_earned" INTEGER NOT NULL,
    "points_redeemed" INTEGER NOT NULL DEFAULT 0,
    "redemption_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "receipt_no" VARCHAR(100),
    "store" VARCHAR(100),
    "region" VARCHAR(100),
    "outlet" VARCHAR(100),
    "status" VARCHAR(20) NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "idx_retailpro_id" ON "transactions"("retailpro_transaction_id");
CREATE INDEX "idx_customer_date" ON "transactions"("customer_id","transaction_date");

CREATE TABLE "points_ledger" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "transaction_id" UUID,
    "points_change" INTEGER NOT NULL,
    "running_balance" INTEGER NOT NULL,
    "reason" VARCHAR(100),
    "reference_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_ledger_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_ledger_customer_created" ON "points_ledger"("customer_id","created_at");

CREATE TABLE "points_expiry" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "points_amount" INTEGER NOT NULL,
    "earning_date" DATE NOT NULL,
    "expiry_date" DATE NOT NULL,
    "is_expired" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent_7d" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent_3d" BOOLEAN NOT NULL DEFAULT false,
    "notification_sent_1d" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "points_expiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "points_expiry_expiry_date_is_expired_idx" ON "points_expiry"("expiry_date","is_expired");

CREATE TABLE "whatsapp_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "api_provider" VARCHAR(50) NOT NULL DEFAULT 'meta',
    "access_token" TEXT,
    "phone_number_id" VARCHAR(100),
    "business_account_id" VARCHAR(100),
    "template_expiry" VARCHAR(100),
    "template_birthday" VARCHAR(100),
    "template_points_earned" VARCHAR(100),
    "template_tier_upgrade" VARCHAR(100),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "whatsapp_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sms_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'twilio',
    "account_sid" TEXT,
    "auth_token" TEXT,
    "from_number" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sms_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "provider" VARCHAR(50) NOT NULL DEFAULT 'sendgrid',
    "api_key" TEXT,
    "from_email" VARCHAR(255),
    "from_name" VARCHAR(255),
    "alert_email" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_logs" (
    "id" BIGSERIAL NOT NULL,
    "customer_id" UUID,
    "type" VARCHAR(50),
    "channel" VARCHAR(20),
    "recipient" VARCHAR(255),
    "content" TEXT,
    "status" VARCHAR(20),
    "error_message" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notification_logs_customer_id_idx" ON "notification_logs"("customer_id");
CREATE INDEX "notification_logs_status_idx" ON "notification_logs"("status");
CREATE INDEX "notification_logs_channel_idx" ON "notification_logs"("channel");

CREATE TABLE "forensic_alerts" (
    "id" BIGSERIAL NOT NULL,
    "mobile_number" VARCHAR(20) NOT NULL,
    "transaction_count" INTEGER NOT NULL,
    "first_transaction_date" TIMESTAMP(3) NOT NULL,
    "last_transaction_date" TIMESTAMP(3) NOT NULL,
    "stores" TEXT[],
    "total_amount" DECIMAL(10,2) NOT NULL,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "alert_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "forensic_alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" BIGSERIAL NOT NULL,
    "entity" VARCHAR(100) NOT NULL,
    "entity_id" VARCHAR(255),
    "action" VARCHAR(50) NOT NULL,
    "changed_by" VARCHAR(255),
    "field" VARCHAR(100),
    "old_value" TEXT,
    "new_value" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity","entity_id");

ALTER TABLE "customers" ADD CONSTRAINT "customers_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "points_expiry" ADD CONSTRAINT "points_expiry_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "loyalty_tiers" ("name","points_from","points_to","spend_from","spend_to","reward_percentage","updated_at") VALUES
  ('Silver',0,999,0,9999.99,2.00,NOW()),
  ('Gold',1000,4999,10000,49999.99,3.00,NOW()),
  ('Platinum',5000,19999,50000,199999.99,4.00,NOW()),
  ('Diamond',20000,NULL,200000,NULL,5.00,NOW());

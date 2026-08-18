-- Migration: add expiry_email and expiry_email_body to email_config
-- expiry_email: recipient address for points-expiry warning emails
-- expiry_email_body: custom template body (supports {customername}, {points}, {expiry_date})

ALTER TABLE "email_config" ADD COLUMN "expiry_email" VARCHAR(255);
ALTER TABLE "email_config" ADD COLUMN "expiry_email_body" TEXT;

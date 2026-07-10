-- Migration: drop expiry_email from email_config
-- The points expiry email is now sent directly to the customer's own email
-- address (customer.email), so a fixed recipient config field is not needed.

ALTER TABLE "email_config" DROP COLUMN IF EXISTS "expiry_email";

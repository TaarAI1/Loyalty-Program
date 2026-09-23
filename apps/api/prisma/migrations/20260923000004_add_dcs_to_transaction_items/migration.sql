-- Add dcs JSONB column to transaction_items table
ALTER TABLE "transaction_items" ADD COLUMN "dcs" JSONB;

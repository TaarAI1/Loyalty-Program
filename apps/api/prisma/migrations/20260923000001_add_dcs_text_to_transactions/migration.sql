-- Add dcs (JSONB array) and text (TEXT) columns to transactions table
ALTER TABLE "transactions" ADD COLUMN "dcs" JSONB;
ALTER TABLE "transactions" ADD COLUMN "text" TEXT;
